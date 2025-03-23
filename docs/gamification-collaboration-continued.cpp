# /collaboration/ml/peer_matching.py (continued)
                match_score = 1.0 - min(1.0, normalized_diff)
                
                feature_matches[feature] = match_score
            
            matches.append({
                "trainee_id": trainee.get('id'),
                "name": trainee.get('name', 'Unknown'),
                "similarity": float(similarities[i]),
                "quality": quality,
                "match_type": match_type,
                "feature_matches": feature_matches
            })
        
        return matches
    
    def generate_anonymized_benchmarks(self, skill_id: str, 
                                     trainee_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate anonymized benchmarks for a skill
        
        Args:
            skill_id: Skill ID to generate benchmarks for
            trainee_data: List of trainee data with performance information
            
        Returns:
            Anonymized benchmark data
        """
        if not trainee_data:
            return {"status": "error", "message": "No trainee data available"}
        
        try:
            # Extract skill performance data
            skill_performances = []
            
            for trainee in trainee_data:
                skills = trainee.get('skills', {})
                
                if skill_id in skills:
                    skill_data = skills[skill_id]
                    
                    # Skip if no level data
                    if 'level' not in skill_data:
                        continue
                    
                    experience = trainee.get('experience_level', 0)
                    
                    skill_performances.append({
                        "level": skill_data['level'],
                        "experience": experience,
                        "trainee_id": trainee.get('id')
                    })
            
            if len(skill_performances) < 3:
                return {"status": "error", "message": "Insufficient performance data for benchmarking"}
            
            # Convert to DataFrame
            df = pd.DataFrame(skill_performances)
            
            # Calculate statistics
            avg_level = float(df['level'].mean())
            median_level = float(df['level'].median())
            percentiles = [10, 25, 50, 75, 90]
            percentile_values = [float(df['level'].quantile(p/100)) for p in percentiles]
            
            # Group by experience level
            df['experience_group'] = pd.cut(df['experience'], bins=[0, 0.33, 0.67, 1.0], 
                                         labels=['beginner', 'intermediate', 'advanced'])
            
            experience_stats = df.groupby('experience_group')['level'].agg(['mean', 'median', 'count']).reset_index()
            
            # Convert to dictionary format
            experience_benchmarks = {}
            
            for _, row in experience_stats.iterrows():
                group = row['experience_group']
                experience_benchmarks[group] = {
                    "mean": float(row['mean']),
                    "median": float(row['median']),
                    "count": int(row['count'])
                }
            
            # Create distribution data (anonymized)
            distributions = []
            
            # Create bins
            bins = np.linspace(0, 1, 11)  # 10 bins from 0 to 1
            counts, bin_edges = np.histogram(df['level'], bins=bins)
            
            for i in range(len(counts)):
                distributions.append({
                    "bin_min": float(bin_edges[i]),
                    "bin_max": float(bin_edges[i+1]),
                    "count": int(counts[i])
                })
            
            # Return results
            return {
                "skill_id": skill_id,
                "trainees_count": len(skill_performances),
                "overall_stats": {
                    "mean": avg_level,
                    "median": median_level,
                    "percentiles": {str(p): v for p, v in zip(percentiles, percentile_values)}
                },
                "experience_benchmarks": experience_benchmarks,
                "distribution": distributions
            }
        
        except Exception as e:
            return {"status": "error", "message": f"Error generating benchmarks: {str(e)}"}
    
    def cluster_trainees(self, trainee_data: List[Dict[str, Any]], 
                       feature_types: List[str] = ["skills", "preferences"]) -> Dict[str, Any]:
        """
        Cluster trainees based on skills and preferences
        
        Args:
            trainee_data: List of trainee data
            feature_types: Types of features to use for clustering
            
        Returns:
            Clustering results
        """
        if not trainee_data:
            return {"status": "error", "message": "No trainee data available"}
        
        # Extract features
        features = []
        trainee_ids = []
        
        for trainee in trainee_data:
            trainee_id = trainee.get('id')
            if not trainee_id:
                continue
                
            trainee_ids.append(trainee_id)
            
            # Extract all relevant features
            trainee_features = {}
            
            if "skills" in feature_types:
                skills = trainee.get('skills', {})
                for skill_id, skill_data in skills.items():
                    trainee_features[f"skill_{skill_id}"] = skill_data.get('level', 0)
            
            if "preferences" in feature_types:
                preferences = trainee.get('learning_preferences', {})
                for pref, value in preferences.items():
                    trainee_features[f"pref_{pref}"] = value
            
            features.append(trainee_features)
        
        if not features:
            return {"status": "error", "message": "No valid features extracted"}
        
        # Get common features (present in all trainees)
        common_features = set(features[0].keys())
        
        for f in features[1:]:
            common_features = common_features.intersection(set(f.keys()))
        
        if not common_features:
            return {"status": "error", "message": "No common features among trainees"}
        
        # Convert to feature matrix
        common_features = list(common_features)
        feature_matrix = np.zeros((len(features), len(common_features)))
        
        for i, f in enumerate(features):
            for j, feature in enumerate(common_features):
                feature_matrix[i, j] = f.get(feature, 0)
        
        # Standardize features
        scaler = StandardScaler()
        feature_matrix_scaled = scaler.fit_transform(feature_matrix)
        
        # Determine optimal number of clusters
        max_clusters = min(10, len(trainee_ids) // 3)
        if max_clusters < 2:
            max_clusters = 2
        
        inertias = []
        for k in range(1, max_clusters + 1):
            kmeans = KMeans(n_clusters=k, random_state=42)
            kmeans.fit(feature_matrix_scaled)
            inertias.append(kmeans.inertia_)
        
        # Find elbow point (simplified)
        optimal_k = 2  # Default
        
        if len(inertias) > 2:
            diffs = np.diff(inertias)
            diffs_of_diffs = np.diff(diffs)
            
            if len(diffs_of_diffs) > 0:
                elbow_idx = np.argmax(diffs_of_diffs) + 1
                optimal_k = elbow_idx + 1
        
        # Apply K-means clustering
        kmeans = KMeans(n_clusters=optimal_k, random_state=42)
        cluster_labels = kmeans.fit_predict(feature_matrix_scaled)
        
        # Create cluster data
        clusters = {}
        
        for i, label in enumerate(cluster_labels):
            cluster_id = int(label)
            trainee_id = trainee_ids[i]
            
            if cluster_id not in clusters:
                clusters[cluster_id] = {
                    "id": cluster_id,
                    "trainees": [],
                    "size": 0,
                    "feature_centroids": {}
                }
            
            clusters[cluster_id]["trainees"].append(trainee_id)
            clusters[cluster_id]["size"] += 1
        
        # Calculate feature centroids for each cluster
        for cluster_id, cluster_data in clusters.items():
            cluster_indices = [i for i, label in enumerate(cluster_labels) if label == cluster_id]
            
            for j, feature in enumerate(common_features):
                feature_values = [feature_matrix[i, j] for i in cluster_indices]
                cluster_data["feature_centroids"][feature] = float(np.mean(feature_values))
        
        # Return results
        return {
            "num_clusters": optimal_k,
            "trainees_count": len(trainee_ids),
            "features_used": common_features,
            "clusters": list(clusters.values())
        }

# /collaboration/ml/content_analyzer.py
import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN

class ContentAnalyzer:
    """Analyze shared content for recommendations and tagging"""
    
    def __init__(self, data_path: str = "content_data"):
        self.data_path = data_path
        
        # Create data directory if it doesn't exist
        os.makedirs(data_path, exist_ok=True)
        
        # Initialize TF-IDF vectorizer
        self.vectorizer = TfidfVectorizer(max_features=5000)
    
    def analyze_content(self, content_id: str, 
                       content_data: Dict[str, Any],
                       all_content: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze content to extract insights and recommendations
        
        Args:
            content_id: ID of the content to analyze
            content_data: Data for the content to analyze
            all_content: List of all content for comparison
            
        Returns:
            Analysis results
        """
        if not content_data:
            return {"status": "error", "message": "No content data provided"}
        
        # Extract text content
        title = content_data.get('title', '')
        description = content_data.get('description', '')
        content_text = content_data.get('content', '')
        
        # Combine text
        text = f"{title} {description} {content_text}"
        
        # Extract tags
        tags = content_data.get('tags', [])
        
        # Results
        results = {
            "content_id": content_id,
            "tags": tags,
            "suggested_tags": [],
            "similar_content": [],
            "keywords": [],
            "readability": {}
        }
        
        try:
            # Extract keywords
            keywords = self._extract_keywords(text)
            results["keywords"] = keywords
            
            # Suggest tags
            if len(tags) < 5:
                suggested_tags = self._suggest_tags(text, keywords, tags)
                results["suggested_tags"] = suggested_tags
            
            # Find similar content
            similar_content = self._find_similar_content(content_id, text, all_content)
            results["similar_content"] = similar_content
            
            # Calculate readability
            readability = self._calculate_readability(text)
            results["readability"] = readability
            
            return results
        
        except Exception as e:
            return {"status": "error", "message": f"Error analyzing content: {str(e)}"}
    
    def _extract_keywords(self, text: str) -> List[Dict[str, Any]]:
        """Extract keywords from text"""
        # Split text into words
        words = text.lower().split()
        
        # Remove common stop words
        stop_words = {"a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "is", "are", "was", "were"}
        filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Count word frequencies
        word_counts = {}
        for word in filtered_words:
            if word in word_counts:
                word_counts[word] += 1
            else:
                word_counts[word] = 1
        
        # Sort by frequency
        sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Create keyword list (top 10)
        keywords = []
        for word, count in sorted_words[:10]:
            keywords.append({
                "word": word,
                "count": count,
                "frequency": count / len(filtered_words) if filtered_words else 0
            })
        
        return keywords
    
    def _suggest_tags(self, text: str, keywords: List[Dict[str, Any]], 
                    existing_tags: List[str]) -> List[str]:
        """Suggest tags based on content"""
        suggested_tags = []
        
        # Use top keywords as suggested tags
        for keyword in keywords:
            word = keyword["word"]
            
            # Skip if already in existing tags
            if word in existing_tags or word in suggested_tags:
                continue
            
            suggested_tags.append(word)
            
            # Limit to 5 suggestions
            if len(suggested_tags) >= 5:
                break
        
        return suggested_tags
    
    def _find_similar_content(self, content_id: str, content_text: str, 
                            all_content: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find similar content based on text similarity"""
        if not all_content:
            return []
        
        # Remove the current content
        other_content = [c for c in all_content if c.get('id') != content_id]
        
        if not other_content:
            return []
        
        try:
            # Extract text from all content
            content_texts = [content_text]
            content_ids = []
            
            for content in other_content:
                title = content.get('title', '')
                description = content.get('description', '')
                text = content.get('content', '')
                
                combined_text = f"{title} {description} {text}"
                content_texts.append(combined_text)
                content_ids.append(content.get('id'))
            
            # Vectorize text
            tfidf_matrix = self.vectorizer.fit_transform(content_texts)
            
            # Calculate similarity between the first document (our content) and the rest
            cosine_similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
            
            # Create similarity data
            similar_content = []
            
            for i, similarity in enumerate(cosine_similarities):
                # Only include if similarity is above threshold
                if similarity > 0.3:
                    content = other_content[i]
                    
                    similar_content.append({
                        "content_id": content.get('id'),
                        "title": content.get('title', ''),
                        "similarity": float(similarity),
                        "shared_by": content.get('trainee_id'),
                        "shared_on": content.get('timestamp')
                    })
            
            # Sort by similarity (descending)
            similar_content.sort(key=lambda x: x['similarity'], reverse=True)
            
            # Limit to top 5
            return similar_content[:5]
        
        except Exception as e:
            print(f"Error finding similar content: {e}")
            return []
    
    def _calculate_readability(self, text: str) -> Dict[str, Any]:
        """Calculate readability metrics"""
        # Split text into sentences and words
        sentences = text.split('.')
        words = text.split()
        
        # Remove empty entries
        sentences = [s.strip() for s in sentences if s.strip()]
        words = [w.strip() for w in words if w.strip()]
        
        # Calculate basic metrics
        sentence_count = len(sentences)
        word_count = len(words)
        
        if sentence_count == 0 or word_count == 0:
            return {
                "sentence_count": 0,
                "word_count": 0,
                "avg_words_per_sentence": 0,
                "avg_word_length": 0,
                "readability_score": 0,
                "readability_level": "unknown"
            }
        
        # Calculate average words per sentence
        avg_words_per_sentence = word_count / sentence_count
        
        # Calculate average word length
        avg_word_length = sum(len(word) for word in words) / word_count
        
        # Calculate simplified readability score
        # Based on simplified Flesch Reading Ease
        readability_score = 206.835 - (1.015 * avg_words_per_sentence) - (84.6 * avg_word_length / 5)
        
        # Ensure score is within reasonable bounds
        readability_score = max(0, min(100, readability_score))
        
        # Determine readability level
        readability_level = "advanced"
        if readability_score >= 80:
            readability_level = "easy"
        elif readability_score >= 60:
            readability_level = "standard"
        elif readability_score >= 40:
            readability_level = "moderate"
        
        return {
            "sentence_count": sentence_count,
            "word_count": word_count,
            "avg_words_per_sentence": float(avg_words_per_sentence),
            "avg_word_length": float(avg_word_length),
            "readability_score": float(readability_score),
            "readability_level": readability_level
        }
    
    def cluster_content(self, content_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Cluster content based on text similarity
        
        Args:
            content_data: List of content items
            
        Returns:
            Clustering results
        """
        if not content_data:
            return {"status": "error", "message": "No content data provided"}
        
        try:
            # Extract text from content
            texts = []
            content_ids = []
            
            for content in content_data:
                title = content.get('title', '')
                description = content.get('description', '')
                text = content.get('content', '')
                
                combined_text = f"{title} {description} {text}"
                texts.append(combined_text)
                content_ids.append(content.get('id'))
            
            # Vectorize text
            tfidf_matrix = self.vectorizer.fit_transform(texts)
            
            # Apply DBSCAN clustering
            dbscan = DBSCAN(eps=0.7, min_samples=2, metric='cosine')
            clusters = dbscan.fit_predict(tfidf_matrix)
            
            # Group content by cluster
            cluster_groups = {}
            
            for i, cluster_id in enumerate(clusters):
                if cluster_id == -1:
                    # Noise points (no cluster)
                    continue
                
                if cluster_id not in cluster_groups:
                    cluster_groups[cluster_id] = {
                        "id": int(cluster_id),
                        "content": [],
                        "size": 0,
                        "top_terms": []
                    }
                
                cluster_groups[cluster_id]["content"].append(content_ids[i])
                cluster_groups[cluster_id]["size"] += 1
            
            # Extract top terms for each cluster
            feature_names = self.vectorizer.get_feature_names_out()
            
            for cluster_id, cluster_data in cluster_groups.items():
                # Get content indices in this cluster
                indices = [i for i, c_id in enumerate(clusters) if c_id == cluster_id]
                
                if indices:
                    # Calculate average TF-IDF for each term in the cluster
                    cluster_vectors = tfidf_matrix[indices]
                    cluster_center = cluster_vectors.mean(axis=0)
                    
                    # Get top 5 terms
                    cluster_center_array = np.array(cluster_center)[0]
                    top_term_indices = cluster_center_array.argsort()[-5:][::-1]
                    top_terms = [feature_names[i] for i in top_term_indices]
                    
                    cluster_data["top_terms"] = top_terms
            
            # Return results
            return {
                "num_clusters": len(cluster_groups),
                "content_count": len(content_ids),
                "noise_count": list(clusters).count(-1),
                "clusters": list(cluster_groups.values())
            }
        
        except Exception as e:
            return {"status": "error", "message": f"Error clustering content: {str(e)}"}

# Unit tests for GamificationController
// /gamification/tests/GamificationControllerTest.cc
#include <gtest/gtest.h>
#include <drogon/drogon.h>
#include <drogon/HttpClient.h>
#include "../controllers/GamificationController.h"
#include "../services/ProgressTrackingService.h"
#include "../services/ChallengeService.h"

using namespace gamification;

class GamificationControllerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Mock services
        progressService_ = std::make_shared<ProgressTrackingService>();
        challengeService_ = std::make_shared<ChallengeService>();
        
        // Create controller with mocked services
        controller_ = std::make_shared<GamificationController>();
        // Inject mocked services (would need dependency injection framework or setter methods)
    }

    std::shared_ptr<GamificationController> controller_;
    std::shared_ptr<ProgressTrackingService> progressService_;
    std::shared_ptr<ChallengeService> challengeService_;
};

TEST_F(GamificationControllerTest, TrackProgressSuccess) {
    // Create request with valid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    
    Json::Value requestBody;
    requestBody["traineeId"] = "trainee-123";
    requestBody["skill"] = "emergency-landing";
    requestBody["value"] = 0.85;
    requestBody["context"] = "training-session";
    req->setBody(requestBody.toStyledString());
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->trackProgress(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k200OK);
        
        // Parse response JSON
        Json::Value responseJson;
        Json::Reader reader;
        reader.parse(resp->getBody(), responseJson);
        
        // Validate response
        EXPECT_TRUE(responseJson.isObject());
        EXPECT_TRUE(responseJson.isMember("traineeId"));
        EXPECT_EQ(responseJson["traineeId"].asString(), "trainee-123");
        EXPECT_TRUE(responseJson.isMember("skill"));
        EXPECT_EQ(responseJson["skill"].asString(), "emergency-landing");
    });
    
    EXPECT_TRUE(callbackCalled);
}

TEST_F(GamificationControllerTest, TrackProgressInvalidJson) {
    // Create request with invalid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    req->setBody("invalid json data");
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->trackProgress(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k400BadRequest);
    });
    
    EXPECT_TRUE(callbackCalled);
}

// Additional tests would be included here...

// Unit tests for CommunityCollaborationController
// /collaboration/tests/CommunityCollaborationControllerTest.cc
#include <gtest/gtest.h>
#include <drogon/drogon.h>
#include <drogon/HttpClient.h>
#include "../controllers/CommunityCollaborationController.h"
#include "../services/PeerLearningService.h"
#include "../services/ContentSharingService.h"

using namespace collaboration;

class CommunityCollaborationControllerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Mock services
        peerLearningService_ = std::make_shared<PeerLearningService>();
        contentSharingService_ = std::make_shared<ContentSharingService>();
        
        // Create controller with mocked services
        controller_ = std::make_shared<CommunityCollaborationController>();
        // Inject mocked services (would need dependency injection framework or setter methods)
    }

    std::shared_ptr<CommunityCollaborationController> controller_;
    std::shared_ptr<PeerLearningService> peerLearningService_;
    std::shared_ptr<ContentSharingService> contentSharingService_;
};

TEST_F(CommunityCollaborationControllerTest, ShareContentSuccess) {
    // Create request with valid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    
    Json::Value requestBody;
    requestBody["traineeId"] = "trainee-123";
    requestBody["title"] = "Emergency Landing Tips";
    requestBody["description"] = "Tips for emergency landing procedures";
    requestBody["contentType"] = "article";
    requestBody["content"] = "Here are some tips for emergency landings...";
    
    Json::Value tags;
    tags.append("emergency");
    tags.append("landing");
    requestBody["tags"] = tags;
    
    req->setBody(requestBody.toStyledString());
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->shareContent(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k200OK);
        
        // Parse response JSON
        Json::Value responseJson;
        Json::Reader reader;
        reader.parse(resp->getBody(), responseJson);
        
        // Validate response
        EXPECT_TRUE(responseJson.isObject());
        EXPECT_TRUE(responseJson.isMember("id"));
        EXPECT_TRUE(responseJson.isMember("title"));
        EXPECT_EQ(responseJson["title"].asString(), "Emergency Landing Tips");
    });
    
    EXPECT_TRUE(callbackCalled);
}

// Additional tests would be included here...

// Python tests for challenge_generator.py
# /gamification/ml/tests/test_challenge_generator.py
import unittest
import tempfile
import os
import json
from datetime import datetime
from gamification.ml.challenge_generator import ChallengeGenerator

class TestChallengeGenerator(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.generator = ChallengeGenerator(data_path=self.temp_dir)
        
        # Create test trainee data
        self.trainee_id = "test_trainee_123"
        self.trainee_data = {
            "skills": {
                "emergency_landing": {
                    "level": 0.7,
                    "name": "Emergency Landing",
                    "progress_rate": 0.03
                },
                "navigation": {
                    "level": 0.4,
                    "name": "Navigation",
                    "progress_rate": 0.01
                },
                "communication": {
                    "level": 0.9,
                    "name": "Communication",
                    "progress_rate": 0.05,
                    "exercises": [
                        {
                            "id": "comm_ex_1",
                            "name": "Radio Communications",
                            "accuracy": 0.92
                        }
                    ]
                }
            },
            "progress": {
                "overall": 0.65,
                "trend": "improving"
            },
            "completed_challenges": [
                {
                    "id": "challenge_1",
                    "type": "skill_mastery",
                    "completed_at": datetime.now().isoformat()
                }
            ],
            "active_challenges": [
                {
                    "id": "challenge_2",
                    "type": "streak",
                    "parameters": {}
                }
            ],
            "modules": {
                "module_1": {
                    "name": "Basic Flight",
                    "completion": 1.0
                },
                "module_2": {
                    "name": "Advanced Maneuvers",
                    "completion": 0.6
                }
            }
        }
    
    def tearDown(self):
        for f in os.listdir(self.temp_dir):
            os.remove(os.path.join(self.temp_dir, f))
        os.rmdir(self.temp_dir)
    
    def test_generate_personalized_challenges(self):
        challenges = self.generator.generate_personalized_challenges(self.trainee_id, self.trainee_data)
        
        # Verify we got some challenges
        self.assertTrue(len(challenges) > 0)
        
        # Verify structure of a challenge
        if len(challenges) > 0:
            challenge = challenges[0]
            self.assertIn("id", challenge)
            self.assertIn("name", challenge)
            self.assertIn("description", challenge)
            self.assertIn("type", challenge)
            self.assertIn("difficulty", challenge)
            self.assertIn("criteria", challenge)
            self.assertIn("rewards", challenge)
    
    def test_no_duplicate_active_challenges(self):
        # Add a skill mastery challenge to active challenges
        self.trainee_data["active_challenges"].append({
            "id": "challenge_3",
            "type": "skill_mastery",
            "parameters": {
                "skill_id": "navigation"
            }
        })
        
        challenges = self.generator.generate_personalized_challenges(self.trainee_id, self.trainee_data)
        
        # Verify no duplicate challenges for navigation
        navigation_challenges = [c for c in challenges 
                               if c.get("type") == "skill_mastery" and 
                               c.get("parameters", {}).get("skill_id") == "navigation"]
        
        self.assertEqual(len(navigation_challenges), 0)
    
    def test_improvement_area_challenges(self):
        # Make navigation clearly an improvement area
        self.trainee_data["skills"]["navigation"]["level"] = 0.2
        
        challenges = self.generator.generate_personalized_challenges(self.trainee_id, self.trainee_data)
        
        # Verify a challenge for navigation is included
        navigation_challenges = [c for c in challenges 
                               if c.get("type") == "skill_mastery" and 
                               c.get("parameters", {}).get("skill_id") == "navigation"]
        
        self.assertTrue(len(navigation_challenges) > 0)

# Python tests for peer_matching.py
# /collaboration/ml/tests/test_peer_matching.py
import unittest
import tempfile
import os
import json
from collaboration.ml.peer_matching import PeerMatcher

class TestPeerMatcher(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.matcher = PeerMatcher(data_path=self.temp_dir)
        
        # Create test trainee data
        self.trainee_id = "test_trainee_123"
        self.trainee_data = {
            "id": self.trainee_id,
            "name": "Test Trainee",
            "skills": {
                "emergency_landing": {
                    "level": 0.7,
                },
                "navigation": {
                    "level": 0.4,
                },
                "communication": {
                    "level": 0.9,
                }
            },
            "learning_preferences": {
                "visual": 0.8,
                "auditory": 0.4,
                "kinesthetic": 0.6
            },
            "experience_level": 0.6,
            "availability": {
                "weekday": 4,
                "weekend": 8
            }
        }
        
        # Create other trainees
        self.other_trainees = [
            {
                "id": "trainee_1",
                "name": "Trainee One",
                "skills": {
                    "emergency_landing": {"level": 0.8},
                    "navigation": {"level": 0.5},
                    "communication": {"level": 0.7}
                },
                "learning_preferences": {
                    "visual": 0.7,
                    "auditory": 0.5,
                    "kinesthetic": 0.6
                },
                "experience_level": 0.7,
                "availability": {
                    "weekday": 5,
                    "weekend": 6
                }
            },
            {
                "id": "trainee_2",
                "name": "Trainee Two",
                "skills": {
                    "emergency_landing": {"level": 0.3},
                    "navigation": {"level": 0.2},
                    "communication": {"level": 0.4}
                },
                "learning_preferences": {
                    "visual": 0.5,
                    "auditory": 0.8,
                    "kinesthetic": 0.3
                },
                "experience_level": 0.3,
                "availability": {
                    "weekday": 2,
                    "weekend": 10
                }
            },
            {
                "id": "trainee_3",
                "name": "Trainee Three",
                "skills": {
                    "emergency_landing": {"level": 0.9},
                    "navigation": {"level": 0.9},
                    "communication": {"level": 0.95}
                },
                "learning_preferences": {
                    "visual": 0.8,
                    "auditory": 0.3,
                    "kinesthetic": 0.7
                },
                "experience_level": 0.9,
                "availability": {
                    "weekday": 8,
                    "weekend": 4
                }
            }
        ]
    
    def tearDown(self):
        for f in os.listdir(self.temp_dir):
            os.remove(os.path.join(self.temp_dir, f))
        os.rmdir(self.temp_dir)
    
    def test_find_peer_matches(self):
        matches = self.matcher.find_peer_matches(self.trainee_id, self.trainee_data, 
                                              self.other_trainees)
        
        # Verify we got some matches
        self.assertTrue(len(matches) > 0)
        
        # Verify structure of a match
        if len(matches) > 0:
            match = matches[0]
            self.assertIn("trainee_id", match)
            self.assertIn("name", match)
            self.assertIn("similarity", match)
            self.assertIn("quality", match)
            self.assertIn("match_type", match)
    
    def test_skill_specific_matching(self):
        # Match specifically for emergency landing
        matches = self.matcher.find_peer_matches(self.trainee_id, self.trainee_data, 
                                              self.other_trainees, "emergency_landing")
        
        # Verify we got some matches
        self.assertTrue(len(matches) > 0)
        
        # Trainee 1 should be a good match (similar skill level)
        trainee1_match = next((m for m in matches if m["trainee_id"] == "trainee_1"), None)
        self.assertIsNotNone(trainee1_match)
        self.assertGreaterEqual(trainee1_match["similarity"], 0.7)
    
    def test_generate_anonymized_benchmarks(self):
        benchmarks = self.matcher.generate_anonymized_benchmarks("emergency_landing", 
                                                             [self.trainee_data] + self.other_trainees)
        
        # Verify structure of benchmarks
        self.assertIn("skill_id", benchmarks)
        self.assertEqual(benchmarks["skill_id"], "emergency_landing")
        self.assertIn("trainees_count", benchmarks)
        self.assertIn("overall_stats", benchmarks)
        self.assertIn("experience_benchmarks", benchmarks)
        self.assertIn("distribution", benchmarks)
        
        # Verify overall stats
        self.assertIn("mean", benchmarks["overall_stats"])
        self.assertIn("median", benchmarks["overall_stats"])
        
        # Verify experience benchmarks
        for level in ["beginner", "intermediate", "advanced"]:
            if level in benchmarks["experience_benchmarks"]:
                self.assertIn("mean", benchmarks["experience_benchmarks"][level])
