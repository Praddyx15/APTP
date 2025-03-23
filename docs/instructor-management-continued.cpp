# /debriefing/ml/debrief_report_generator.py (continued)
                })
        
        # Add overall assessment
        report['overall_assessment'] = self._generate_overall_assessment(session_data)
        
        return report
    
    def _generate_section(self, section_id: str, session_data: Dict[str, Any], 
                        custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate content for a specific report section"""
        if section_id == "summary":
            return self._generate_summary_section(session_data, custom_params)
        elif section_id == "performance":
            return self._generate_performance_section(session_data, custom_params)
        elif section_id == "deviations":
            return self._generate_deviations_section(session_data, custom_params)
        elif section_id == "recommendations":
            return self._generate_recommendations_section(session_data, custom_params)
        elif section_id == "insights":
            return self._generate_insights_section(session_data, custom_params)
        elif section_id == "key_issues":
            return self._generate_key_issues_section(session_data, custom_params)
        elif section_id == "teaching_points":
            return self._generate_teaching_points_section(session_data, custom_params)
        elif section_id == "discussion_topics":
            return self._generate_discussion_topics_section(session_data, custom_params)
        elif section_id == "follow_up":
            return self._generate_follow_up_section(session_data, custom_params)
        else:
            return {"text": f"Content for section '{section_id}' not available"}
    
    def _generate_summary_section(self, session_data: Dict[str, Any], 
                                custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate executive summary section"""
        deviations = session_data.get('deviations', [])
        metrics = session_data.get('performance_metrics', {})
        
        # Count deviations by severity
        high_count = sum(1 for d in deviations if d.get('severity') == 'high')
        medium_count = sum(1 for d in deviations if d.get('severity') == 'medium')
        low_count = sum(1 for d in deviations if d.get('severity') == 'low')
        
        # Calculate overall performance score (0-100)
        performance_score = 100
        if deviations:
            # Deduct points based on severity and number of deviations
            performance_score -= min(50, high_count * 10)
            performance_score -= min(30, medium_count * 5)
            performance_score -= min(10, low_count * 2)
        
        # Performance rating
        if performance_score >= 90:
            rating = "Excellent"
        elif performance_score >= 80:
            rating = "Good"
        elif performance_score >= 70:
            rating = "Satisfactory"
        elif performance_score >= 60:
            rating = "Needs Improvement"
        else:
            rating = "Unsatisfactory"
        
        # Generate summary text
        summary_text = f"Training session completed with an overall performance rating of {rating} ({performance_score}/100). "
        
        if high_count > 0:
            summary_text += f"There were {high_count} high-severity deviations that require attention. "
        
        if medium_count > 0:
            summary_text += f"{medium_count} medium-severity deviations were noted. "
        
        # Add strengths
        strengths = session_data.get('strengths', [])
        if strengths:
            summary_text += "Key strengths included "
            strength_texts = [s.get('description', 'unnamed strength') for s in strengths[:3]]
            summary_text += ", ".join(strength_texts) + ". "
        
        # Add improvement areas
        improvements = session_data.get('improvement_areas', [])
        if improvements:
            summary_text += "Areas needing improvement include "
            improvement_texts = [i.get('description', 'unnamed area') for i in improvements[:3]]
            summary_text += ", ".join(improvement_texts) + "."
        
        return {
            "text": summary_text,
            "performance_score": performance_score,
            "rating": rating,
            "high_deviations": high_count,
            "medium_deviations": medium_count,
            "low_deviations": low_count
        }
    
    def _generate_performance_section(self, session_data: Dict[str, Any], 
                                   custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate performance metrics section"""
        metrics = session_data.get('performance_metrics', {})
        
        # Generate visualizations of key metrics
        visualizations = []
        
        # Get visualization preferences
        show_charts = True
        if custom_params and 'show_charts' in custom_params:
            show_charts = custom_params.get('show_charts', True)
        
        # Generate charts if enabled
        if show_charts and 'flight_data' in session_data:
            flight_data = pd.DataFrame(session_data.get('flight_data', []))
            
            if not flight_data.empty:
                # Key metrics to visualize
                key_metrics = [
                    {'name': 'airspeed', 'title': 'Airspeed', 'unit': 'knots'},
                    {'name': 'altitude', 'title': 'Altitude', 'unit': 'feet'},
                    {'name': 'vertical_speed', 'title': 'Vertical Speed', 'unit': 'ft/min'},
                    {'name': 'bank_angle', 'title': 'Bank Angle', 'unit': 'degrees'},
                    {'name': 'pitch_angle', 'title': 'Pitch Angle', 'unit': 'degrees'}
                ]
                
                # Generate chart for each metric if available
                for metric in key_metrics:
                    if metric['name'] in flight_data.columns:
                        try:
                            # Create matplotlib figure
                            plt.figure(figsize=(8, 4))
                            plt.plot(flight_data.index, flight_data[metric['name']])
                            plt.title(f"{metric['title']} vs Time")
                            plt.xlabel('Time')
                            plt.ylabel(f"{metric['title']} ({metric['unit']})")
                            plt.grid(True)
                            
                            # Add deviations as highlights if available
                            deviations = [d for d in session_data.get('deviations', []) 
                                        if d.get('parameter') == metric['name']]
                            
                            for deviation in deviations:
                                start_idx = int(deviation.get('start_time', 0))
                                end_idx = int(deviation.get('end_time', 0))
                                
                                if start_idx >= 0 and end_idx <= len(flight_data):
                                    color = 'red' if deviation.get('severity') == 'high' else 'orange' if deviation.get('severity') == 'medium' else 'yellow'
                                    plt.axvspan(start_idx, end_idx, alpha=0.3, color=color)
                            
                            # Save to bytes buffer
                            buf = io.BytesIO()
                            plt.savefig(buf, format='png')
                            buf.seek(0)
                            
                            # Convert to base64
                            img_str = base64.b64encode(buf.read()).decode('utf-8')
                            
                            # Add to visualizations
                            visualizations.append({
                                'metric': metric['name'],
                                'title': f"{metric['title']} vs Time",
                                'image_data': img_str,
                                'deviations': len(deviations)
                            })
                            
                            plt.close()
                        except Exception as e:
                            print(f"Error generating chart for {metric['name']}: {e}")
        
        # Format metrics for display
        formatted_metrics = {}
        
        for category, category_metrics in metrics.items():
            formatted_metrics[category] = []
            
            for name, value in category_metrics.items():
                formatted_metrics[category].append({
                    'name': name,
                    'value': value,
                    'formatted_value': self._format_metric_value(name, value)
                })
        
        return {
            "metrics": formatted_metrics,
            "visualizations": visualizations,
            "key_stats": self._extract_key_stats(session_data)
        }
    
    def _generate_deviations_section(self, session_data: Dict[str, Any], 
                                  custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate significant deviations section"""
        deviations = session_data.get('deviations', [])
        
        # Sort by severity (high to low)
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        sorted_deviations = sorted(deviations, key=lambda d: (severity_order.get(d.get('severity', 'low'), 3), 
                                                            -d.get('duration', 0)))
        
        # Get deviation display preferences
        show_low_severity = False
        if custom_params and 'show_low_severity' in custom_params:
            show_low_severity = custom_params.get('show_low_severity', False)
        
        # Filter low severity if needed
        if not show_low_severity:
            sorted_deviations = [d for d in sorted_deviations if d.get('severity') != 'low']
        
        # Generate detailed deviation descriptions
        deviation_details = []
        
        for deviation in sorted_deviations:
            detail = {
                'id': deviation.get('id', 'unknown'),
                'parameter': deviation.get('parameter', 'unknown'),
                'severity': deviation.get('severity', 'medium'),
                'start_time': deviation.get('start_time', 0),
                'end_time': deviation.get('end_time', 0),
                'duration': deviation.get('duration', 0),
                'description': self._generate_deviation_description(deviation)
            }
            
            deviation_details.append(detail)
        
        # Group by parameter for summary
        parameter_summary = {}
        
        for deviation in deviations:
            param = deviation.get('parameter', 'unknown')
            severity = deviation.get('severity', 'medium')
            
            if param not in parameter_summary:
                parameter_summary[param] = {'high': 0, 'medium': 0, 'low': 0, 'total': 0}
            
            parameter_summary[param][severity] += 1
            parameter_summary[param]['total'] += 1
        
        # Sort parameters by total deviations
        sorted_parameters = sorted(parameter_summary.items(), key=lambda x: x[1]['total'], reverse=True)
        
        return {
            "count": len(sorted_deviations),
            "by_severity": {
                "high": sum(1 for d in deviations if d.get('severity') == 'high'),
                "medium": sum(1 for d in deviations if d.get('severity') == 'medium'),
                "low": sum(1 for d in deviations if d.get('severity') == 'low')
            },
            "by_parameter": {param: counts for param, counts in sorted_parameters},
            "details": deviation_details
        }
    
    def _generate_recommendations_section(self, session_data: Dict[str, Any], 
                                       custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate recommendations section"""
        deviations = session_data.get('deviations', [])
        improvement_areas = session_data.get('improvement_areas', [])
        
        # Generate recommendations based on deviations and improvement areas
        recommendations = []
        
        # Process improvement areas
        for area in improvement_areas:
            area_type = area.get('type', '')
            area_name = area.get('area', '')
            
            if area_type == 'parameter_control':
                recommendations.append({
                    'category': 'Parameter Control',
                    'area': area_name,
                    'text': f"Improve control of {area_name} by practicing smooth and precise inputs.",
                    'priority': 'high' if area.get('high_severity_count', 0) > 0 else 'medium'
                })
            elif area_type == 'procedure_compliance':
                recommendations.append({
                    'category': 'Procedure Compliance',
                    'area': area_name,
                    'text': f"Review and practice {area_name} procedures to ensure consistent compliance.",
                    'priority': 'high' if area.get('high_severity_count', 0) > 0 else 'medium'
                })
        
        # Process procedure deviations
        procedure_deviations = [d for d in deviations if 'procedure' in d]
        
        for deviation in procedure_deviations:
            proc = deviation.get('procedure', '')
            step = deviation.get('step', 0)
            desc = deviation.get('description', '')
            
            if any(r['area'] == proc and r['category'] == 'Procedure Compliance' for r in recommendations):
                continue  # Already have a recommendation for this procedure
            
            recommendations.append({
                'category': 'Procedure Compliance',
                'area': proc,
                'text': f"Review {proc} procedure, particularly step {step}: {desc}",
                'priority': deviation.get('severity', 'medium')
            })
        
        # Process parameter deviations not already covered by improvement areas
        covered_params = [area['area'] for area in improvement_areas if area.get('type') == 'parameter_control']
        param_deviations = [d for d in deviations if d.get('parameter') not in covered_params and 'parameter' in d]
        
        # Group by parameter
        param_groups = {}
        for deviation in param_deviations:
            param = deviation.get('parameter', '')
            if param not in param_groups:
                param_groups[param] = []
            param_groups[param].append(deviation)
        
        for param, devs in param_groups.items():
            if len(devs) >= 2 or any(d.get('severity') == 'high' for d in devs):
                recommendations.append({
                    'category': 'Parameter Control',
                    'area': param,
                    'text': f"Practice maintaining {param} within prescribed limits.",
                    'priority': 'high' if any(d.get('severity') == 'high' for d in devs) else 'medium'
                })
        
        # Add training recommendations
        strengths = session_data.get('strengths', [])
        if len(recommendations) > 0:
            focus_areas = [r['area'] for r in recommendations if r['priority'] == 'high']
            
            if focus_areas:
                recommendations.append({
                    'category': 'Training',
                    'area': 'Focus Training',
                    'text': f"Schedule focused training sessions on: {', '.join(focus_areas[:3])}",
                    'priority': 'high'
                })
        
        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        recommendations.sort(key=lambda r: priority_order.get(r.get('priority', 'medium'), 1))
        
        return {
            "count": len(recommendations),
            "by_priority": {
                "high": sum(1 for r in recommendations if r.get('priority') == 'high'),
                "medium": sum(1 for r in recommendations if r.get('priority') == 'medium'),
                "low": sum(1 for r in recommendations if r.get('priority') == 'low')
            },
            "by_category": {
                category: len([r for r in recommendations if r.get('category') == category])
                for category in set(r.get('category', '') for r in recommendations)
            },
            "items": recommendations
        }
    
    def _generate_insights_section(self, session_data: Dict[str, Any], 
                                custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate AI insights section"""
        # This would be populated by the _generate_ai_insights method
        # Just a placeholder here
        return {
            "text": "AI insights will be generated based on session data analysis."
        }
    
    def _generate_key_issues_section(self, session_data: Dict[str, Any], 
                                  custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate key issues section for quick report"""
        deviations = session_data.get('deviations', [])
        
        # Sort by severity (high to low)
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        sorted_deviations = sorted(deviations, key=lambda d: (severity_order.get(d.get('severity', 'low'), 3), 
                                                            -d.get('duration', 0)))
        
        # Only include high and medium severity
        filtered_deviations = [d for d in sorted_deviations if d.get('severity') in ['high', 'medium']]
        
        # Limit to top 5
        top_deviations = filtered_deviations[:5]
        
        # Generate issue descriptions
        issues = []
        
        for deviation in top_deviations:
            issue = {
                'parameter': deviation.get('parameter', 'unknown'),
                'severity': deviation.get('severity', 'medium'),
                'description': self._generate_deviation_description(deviation, brief=True)
            }
            
            issues.append(issue)
        
        return {
            "count": len(issues),
            "items": issues
        }
    
    def _generate_teaching_points_section(self, session_data: Dict[str, Any], 
                                       custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate teaching points section for instructor report"""
        deviations = session_data.get('deviations', [])
        improvement_areas = session_data.get('improvement_areas', [])
        
        # Generate teaching points based on deviations and improvement areas
        teaching_points = []
        
        # Process improvement areas
        for area in improvement_areas:
            area_type = area.get('type', '')
            area_name = area.get('area', '')
            
            if area_type == 'parameter_control':
                teaching_points.append({
                    'category': 'Parameter Control',
                    'area': area_name,
                    'point': f"Demonstrate proper {area_name} control technique.",
                    'teaching_method': 'Demonstration and guided practice',
                    'priority': 'high' if area.get('high_severity_count', 0) > 0 else 'medium'
                })
            elif area_type == 'procedure_compliance':
                teaching_points.append({
                    'category': 'Procedure Compliance',
                    'area': area_name,
                    'point': f"Review correct sequence and timing for {area_name} procedures.",
                    'teaching_method': 'Walkthrough and demonstration',
                    'priority': 'high' if area.get('high_severity_count', 0) > 0 else 'medium'
                })
        
        # Add specific teaching methods based on deviation types
        for deviation in deviations:
            if deviation.get('severity') != 'high':
                continue
            
            param = deviation.get('parameter', '')
            dev_type = deviation.get('deviation_type', '')
            
            # Skip if already covered
            if any(tp['area'] == param for tp in teaching_points):
                continue
            
            if dev_type == 'above_maximum':
                teaching_points.append({
                    'category': 'Parameter Control',
                    'area': param,
                    'point': f"Demonstrate techniques to prevent {param} from exceeding upper limits.",
                    'teaching_method': 'Guided practice with immediate feedback',
                    'priority': 'high'
                })
            elif dev_type == 'below_minimum':
                teaching_points.append({
                    'category': 'Parameter Control',
                    'area': param,
                    'point': f"Demonstrate techniques to prevent {param} from falling below minimum limits.",
                    'teaching_method': 'Guided practice with immediate feedback',
                    'priority': 'high'
                })
            elif dev_type == 'rate_of_change_exceeded':
                teaching_points.append({
                    'category': 'Parameter Control',
                    'area': param,
                    'point': f"Demonstrate smooth control inputs to manage {param} rate of change.",
                    'teaching_method': 'Demonstration and muscle memory exercises',
                    'priority': 'high'
                })
        
        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        teaching_points.sort(key=lambda tp: priority_order.get(tp.get('priority', 'medium'), 1))
        
        return {
            "count": len(teaching_points),
            "items": teaching_points
        }
    
    def _generate_discussion_topics_section(self, session_data: Dict[str, Any], 
                                         custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate discussion topics section for instructor report"""
        deviations = session_data.get('deviations', [])
        key_moments = session_data.get('key_moments', [])
        
        # Generate discussion topics based on deviations and key moments
        topics = []
        
        # Process high severity deviations
        high_deviations = [d for d in deviations if d.get('severity') == 'high']
        
        # Group by parameter or procedure
        grouped_deviations = {}
        for deviation in high_deviations:
            key = deviation.get('parameter', deviation.get('procedure', 'unknown'))
            if key not in grouped_deviations:
                grouped_deviations[key] = []
            grouped_deviations[key].append(deviation)
        
        # Generate topics for major deviations
        for key, devs in grouped_deviations.items():
            if len(devs) > 0:
                topics.append({
                    'category': 'Performance Analysis',
                    'topic': f"Analysis of {key} deviations",
                    'questions': [
                        f"What factors contributed to the {key} deviations?",
                        f"What techniques can help maintain proper {key} control?",
                        f"How would you recognize and correct similar {key} issues in the future?"
                    ],
                    'priority': 'high'
                })
        
        # Process key moments for situational awareness topics
        if key_moments:
            topics.append({
                'category': 'Situational Awareness',
                'topic': "Key decision points during the session",
                'questions': [
                    "What were the critical moments during this session?",
                    "How did you recognize and respond to these situations?",
                    "What alternative responses could have been appropriate?"
                ],
                'priority': 'medium'
            })
        
        # Add standard discussion topics
        topics.append({
            'category': 'Self-Assessment',
            'topic': "Self-evaluation of performance",
            'questions': [
                "How would you assess your overall performance in this session?",
                "What aspects of your performance are you most satisfied with?",
                "What areas do you think need the most improvement?"
            ],
            'priority': 'medium'
        })
        
        topics.append({
            'category': 'Knowledge Integration',
            'topic': "Application of theoretical knowledge",
            'questions': [
                "How did your theoretical knowledge inform your performance?",
                "Were there any situations where you felt knowledge gaps affected your performance?",
                "What specific knowledge areas would you like to review before the next session?"
            ],
            'priority': 'medium'
        })
        
        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        topics.sort(key=lambda t: priority_order.get(t.get('priority', 'medium'), 1))
        
        return {
            "count": len(topics),
            "items": topics
        }
    
    def _generate_follow_up_section(self, session_data: Dict[str, Any], 
                                  custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate follow-up training recommendations section for instructor report"""
        improvement_areas = session_data.get('improvement_areas', [])
        deviations = session_data.get('deviations', [])
        
        # Generate follow-up recommendations
        follow_ups = []
        
        # High priority areas based on high severity deviations
        high_severity_params = set(d.get('parameter', d.get('procedure', '')) 
                                for d in deviations if d.get('severity') == 'high')
        
        # Add recommendations for high priority areas
        for param in high_severity_params:
            follow_ups.append({
                'category': 'Focused Training',
                'area': param,
                'recommendation': f"Schedule dedicated practice session focusing on {param} control and procedures.",
                'resources': [
                    {'type': 'simulator_session', 'name': f"{param} control practice"},
                    {'type': 'study_material', 'name': f"{param} operational guidelines"}
                ],
                'priority': 'high'
            })
        
        # Add recommendations based on improvement areas
        for area in improvement_areas:
            area_name = area.get('area', '')
            area_type = area.get('type', '')
            
            # Skip if already covered in high priority
            if area_name in high_severity_params:
                continue
            
            if area_type == 'parameter_control':
                follow_ups.append({
                    'category': 'Skill Development',
                    'area': area_name,
                    'recommendation': f"Additional practice on {area_name} control techniques.",
                    'resources': [
                        {'type': 'exercise', 'name': f"{area_name} precision exercise"},
                        {'type': 'video', 'name': f"{area_name} control demonstration"}
                    ],
                    'priority': 'medium'
                })
            elif area_type == 'procedure_compliance':
                follow_ups.append({
                    'category': 'Procedure Review',
                    'area': area_name,
                    'recommendation': f"Review and practice {area_name} procedures.",
                    'resources': [
                        {'type': 'manual', 'name': f"{area_name} procedure guide"},
                        {'type': 'checklist', 'name': f"{area_name} procedure checklist"}
                    ],
                    'priority': 'medium'
                })
        
        # Add general follow-up if no specific areas
        if not follow_ups:
            follow_ups.append({
                'category': 'General Practice',
                'area': 'Overall Proficiency',
                'recommendation': "Continue regular practice to maintain proficiency.",
                'resources': [
                    {'type': 'simulator_session', 'name': "Standard proficiency session"},
                    {'type': 'study_material', 'name': "Operating procedures review"}
                ],
                'priority': 'low'
            })
        
        # Sort by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        follow_ups.sort(key=lambda f: priority_order.get(f.get('priority', 'medium'), 1))
        
        return {
            "count": len(follow_ups),
            "items": follow_ups
        }
    
    def _generate_overall_assessment(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate overall performance assessment"""
        deviations = session_data.get('deviations', [])
        
        # Count deviations by severity
        high_count = sum(1 for d in deviations if d.get('severity') == 'high')
        medium_count = sum(1 for d in deviations if d.get('severity') == 'medium')
        low_count = sum(1 for d in deviations if d.get('severity') == 'low')
        
        # Calculate overall performance score (0-100)
        performance_score = 100
        if deviations:
            # Deduct points based on severity and number of deviations
            performance_score -= min(50, high_count * 10)
            performance_score -= min(30, medium_count * 5)
            performance_score -= min(10, low_count * 2)
        
        # Performance rating
        if performance_score >= 90:
            rating = "Excellent"
            description = "Performance exceeded standards with minimal deviations."
        elif performance_score >= 80:
            rating = "Good"
            description = "Performance met standards with minor deviations."
        elif performance_score >= 70:
            rating = "Satisfactory"
            description = "Performance met minimum standards with notable deviations."
        elif performance_score >= 60:
            rating = "Needs Improvement"
            description = "Performance below standards with significant deviations."
        else:
            rating = "Unsatisfactory"
            description = "Performance substantially below standards with critical deviations."
        
        return {
            "score": performance_score,
            "rating": rating,
            "description": description,
            "deviation_counts": {
                "high": high_count,
                "medium": medium_count,
                "low": low_count,
                "total": high_count + medium_count + low_count
            }
        }
    
    def _generate_ai_insights(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI insights for the session"""
        # This would implement advanced ML analysis
        # Using a simplified approach for demonstration
        flight_data = None
        
        if 'flight_data' in session_data:
            try:
                flight_data = pd.DataFrame(session_data['flight_data'])
            except:
                flight_data = None
        
        insights = {
            "patterns": [],
            "correlations": [],
            "anomalies": []
        }
        
        if flight_data is not None and not flight_data.empty:
            # Get numeric columns
            numeric_cols = flight_data.select_dtypes(include=[np.number]).columns
            
            if len(numeric_cols) >= 2:
                # Check for correlations between parameters
                correlation_matrix = flight_data[numeric_cols].corr()
                
                # Find strong correlations
                for i in range(len(numeric_cols)):
                    for j in range(i+1, len(numeric_cols)):
                        col1, col2 = numeric_cols[i], numeric_cols[j]
                        corr = correlation_matrix.loc[col1, col2]
                        
                        if abs(corr) > 0.7:
                            direction = "positive" if corr > 0 else "negative"
                            insights["correlations"].append({
                                "parameter1": col1,
                                "parameter2": col2,
                                "correlation": float(corr),
                                "direction": direction,
                                "description": f"Strong {direction} correlation ({abs(corr):.2f}) between {col1} and {col2}"
                            })
            
            # Check for patterns in individual parameters
            for col in numeric_cols:
                if len(flight_data) > 20:
                    values = flight_data[col].values
                    
                    # Check for oscillations/fluctuations (simplified)
                    if len(values) > 30:
                        diffs = np.diff(values)
                        sign_changes = np.sum(np.diff(np.signbit(diffs)))
                        
                        if sign_changes > len(values) * 0.2:
                            insights["patterns"].append({
                                "parameter": col,
                                "pattern": "oscillation",
                                "description": f"Frequent oscillations detected in {col}",
                                "severity": "medium" if sign_changes > len(values) * 0.3 else "low"
                            })
                    
                    # Check for trends (simplified)
                    if len(values) > 30:
                        # Calculate moving average
                        window = 5
                        if len(values) >= window * 2:
                            moving_avg = np.convolve(values, np.ones(window)/window, mode='valid')
                            
                            # Check for consistent increase or decrease
                            start_avg = np.mean(moving_avg[:window])
                            end_avg = np.mean(moving_avg[-window:])
                            
                            if abs(end_avg - start_avg) > np.std(values) * 1.5:
                                direction = "increasing" if end_avg > start_avg else "decreasing"
                                insights["patterns"].append({
                                    "parameter": col,
                                    "pattern": "trend",
                                    "direction": direction,
                                    "description": f"Overall {direction} trend detected in {col}",
                                    "severity": "low"
                                })
            
            # Detect anomalies using Isolation Forest
            if len(flight_data) > 50 and len(numeric_cols) >= 2:
                try:
                    # Apply Isolation Forest for anomaly detection
                    clf = IsolationForest(contamination=0.05, random_state=42)
                    clf.fit(flight_data[numeric_cols])
                    
                    # Get anomaly scores
                    scores = clf.decision_function(flight_data[numeric_cols])
                    anomalies = clf.predict(flight_data[numeric_cols]) == -1
                    
                    if np.any(anomalies):
                        # Find segments of consecutive anomalies
                        segments = []
                        current_segment = []
                        
                        for i, is_anomaly in enumerate(anomalies):
                            if is_anomaly:
                                current_segment.append(i)
                            elif current_segment:
                                segments.append(current_segment)
                                current_segment = []
                        
                        if current_segment:
                            segments.append(current_segment)
                        
                        # Process significant segments
                        for segment in segments:
                            if len(segment) >= 3:  # Only consider significant segments
                                start_idx = segment[0]
                                end_idx = segment[-1]
                                
                                # Find which parameters contributed most to the anomaly
                                segment_data = flight_data.iloc[segment]
                                param_scores = []
                                
                                for col in numeric_cols:
                                    z_scores = np.abs(zscore(segment_data[col], nan_policy='omit'))
                                    mean_z = np.mean(z_scores)
                                    param_scores.append((col, mean_z))
                                
                                # Sort by contribution
                                param_scores.sort(key=lambda x: x[1], reverse=True)
                                
                                # Get top contributors
                                top_params = [p[0] for p in param_scores[:3] if p[1] > 1.5]
                                
                                if top_params:
                                    insights["anomalies"].append({
                                        "start_time": float(start_idx),
                                        "end_time": float(end_idx),
                                        "duration": float(end_idx - start_idx),
                                        "key_parameters": top_params,
                                        "severity": "high" if len(segment) > 10 else "medium",
                                        "description": f"Complex anomaly detected involving {', '.join(top_params)}"
                                    })
                except Exception as e:
                    print(f"Error in anomaly detection: {e}")
        
        return insights
    
    def _generate_deviation_description(self, deviation: Dict[str, Any], brief: bool = False) -> str:
        """Generate human-readable description of a deviation"""
        param = deviation.get('parameter', deviation.get('procedure', 'Unknown parameter'))
        dev_type = deviation.get('deviation_type', '')
        severity = deviation.get('severity', 'medium')
        
        if 'procedure' in deviation:
            # Procedure deviation
            procedure = deviation.get('procedure', '')
            step = deviation.get('step', '')
            expected = deviation.get('expected_value', '')
            actual = deviation.get('actual_mean_value', '')
            description = deviation.get('description', '')
            
            if brief:
                return f"{procedure} procedure deviation: {description}"
            else:
                return (f"{severity.capitalize()} severity deviation in {procedure} procedure. "
                       f"Expected {expected} but recorded {actual:.1f}. {description}")
        else:
            # Parameter deviation
            if dev_type == 'above_maximum':
                reference = deviation.get('reference_value', 0)
                actual = deviation.get('mean_value', 0)
                
                if brief:
                    return f"{param} exceeded maximum limit by {actual - reference:.1f} units"
                else:
                    return (f"{severity.capitalize()} severity deviation: {param} exceeded maximum limit. "
                           f"Reference value: {reference:.1f}, actual value: {actual:.1f}.")
            
            elif dev_type == 'below_minimum':
                reference = deviation.get('reference_value', 0)
                actual = deviation.get('mean_value', 0)
                
                if brief:
                    return f"{param} below minimum limit by {reference - actual:.1f} units"
                else:
                    return (f"{severity.capitalize()} severity deviation: {param} below minimum limit. "
                           f"Reference value: {reference:.1f}, actual value: {actual:.1f}.")
            
            elif dev_type == 'rate_of_change_exceeded':
                if brief:
                    return f"{param} rate of change exceeded limits"
                else:
                    return (f"{severity.capitalize()} severity deviation: {param} rate of change exceeded limits. "
                           f"This may indicate abrupt control inputs.")
            
            elif dev_type == 'absolute_maximum_exceeded':
                max_val = deviation.get('max_value', 0)
                
                if brief:
                    return f"{param} exceeded absolute maximum at {max_val:.1f}"
                else:
                    return (f"{severity.capitalize()} severity deviation: {param} exceeded absolute maximum safety limit, "
                           f"reaching {max_val:.1f}.")
            
            else:
                # Generic description
                if brief:
                    return f"{param} deviation of {severity} severity"
                else:
                    return f"{severity.capitalize()} severity deviation in {param} control or operation."
    
    def _extract_key_stats(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key statistics from session data"""
        metrics = session_data.get('performance_metrics', {})
        
        key_stats = {
            'session_duration': session_data.get('session_duration', 0),
            'maneuvers_completed': session_data.get('maneuvers_completed', 0),
            'tasks_completed': session_data.get('tasks_completed', 0)
        }
        
        # Add key metrics if available
        if 'flight' in metrics:
            flight_metrics = metrics['flight']
            
            if 'avg_airspeed_error' in flight_metrics:
                key_stats['avg_airspeed_error'] = flight_metrics['avg_airspeed_error']
            
            if 'avg_altitude_error' in flight_metrics:
                key_stats['avg_altitude_error'] = flight_metrics['avg_altitude_error']
            
            if 'heading_maintenance' in flight_metrics:
                key_stats['heading_maintenance'] = flight_metrics['heading_maintenance']
        
        return key_stats
    
    def _format_metric_value(self, name: str, value: Any) -> str:
        """Format metric value based on metric type"""
        if isinstance(value, float):
            # Apply different formatting based on metric name
            if 'percent' in name.lower() or name.endswith('_pct'):
                return f"{value:.1f}%"
            elif 'time' in name.lower() or name.endswith('_time'):
                # Format as time (MM:SS)
                minutes = int(value // 60)
                seconds = int(value % 60)
                return f"{minutes:02d}:{seconds:02d}"
            elif 'angle' in name.lower() or name.endswith('_angle'):
                return f"{value:.1f}°"
            elif 'speed' in name.lower() or name.endswith('_speed'):
                return f"{value:.1f} kts"
            elif 'altitude' in name.lower() or name.endswith('_altitude'):
                return f"{value:.0f} ft"
            else:
                # Default numeric formatting
                return f"{value:.2f}"
        elif isinstance(value, int):
            return str(value)
        elif isinstance(value, bool):
            return "Yes" if value else "No"
        else:
            return str(value)

# Python ML component for dashboard analytics
# /dashboard/ml/kpi_analyzer.py
import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sklearn.linear_model import LinearRegression
import statsmodels.api as sm
from statsmodels.tsa.arima.model import ARIMA

class KpiAnalyzer:
    """Analyze and forecast KPIs for the administrative dashboard"""
    
    def __init__(self, data_path: str = "kpi_data"):
        self.data_path = data_path
        
        # Create data directory if it doesn't exist
        os.makedirs(data_path, exist_ok=True)
    
    def analyze_kpi_trends(self, kpi_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Analyze trends in KPI data
        
        Args:
            kpi_data: Dictionary mapping KPI names to lists of data points
            
        Returns:
            Dictionary with trend analysis results
        """
        results = {
            "trends": {},
            "anomalies": {},
            "correlations": {},
            "forecasts": {}
        }
        
        # Process each KPI
        for kpi_name, data_points in kpi_data.items():
            # Convert to DataFrame
            try:
                df = pd.DataFrame(data_points)
                
                # Ensure required columns
                if 'value' not in df.columns or 'timestamp' not in df.columns:
                    continue
                
                # Convert timestamp to datetime
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                
                # Sort by timestamp
                df = df.sort_values('timestamp')
                
                # Calculate trend
                trend_result = self._calculate_trend(df, kpi_name)
                if trend_result:
                    results["trends"][kpi_name] = trend_result
                
                # Detect anomalies
                anomalies = self._detect_anomalies(df, kpi_name)
                if anomalies:
                    results["anomalies"][kpi_name] = anomalies
                
                # Generate forecast
                forecast = self._generate_forecast(df, kpi_name)
                if forecast:
                    results["forecasts"][kpi_name] = forecast
            
            except Exception as e:
                print(f"Error analyzing KPI {kpi_name}: {e}")
        
        # Calculate correlations between KPIs
        try:
            if len(kpi_data) >= 2:
                correlations = self._calculate_correlations(kpi_data)
                if correlations:
                    results["correlations"] = correlations
        except Exception as e:
            print(f"Error calculating correlations: {e}")
        
        return results
    
    def _calculate_trend(self, df: pd.DataFrame, kpi_name: str) -> Dict[str, Any]:
        """Calculate trend for a KPI time series"""
        if len(df) < 3:
            return None
        
        try:
            # Calculate simple statistics
            latest_value = float(df['value'].iloc[-1])
            mean_value = float(df['value'].mean())
            min_value = float(df['value'].min())
            max_value = float(df['value'].max())
            
            # Calculate percentage change over the period
            first_value = float(df['value'].iloc[0])
            pct_change = ((latest_value - first_value) / first_value * 100) if first_value != 0 else 0
            
            # Calculate linear regression for trend
            df['days'] = (df['timestamp'] - df['timestamp'].min()).dt.total_seconds() / (24 * 3600)
            X = df['days'].values.reshape(-1, 1)
            y = df['value'].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            slope = float(model.coef_[0])
            r_squared = float(model.score(X, y))
            
            # Determine trend direction and strength
            if abs(slope) < 0.001 or r_squared < 0.3:
                direction = "stable"
                strength = "weak" if r_squared < 0.3 else "moderate"
            else:
                direction = "increasing" if slope > 0 else "decreasing"
                strength = "strong" if r_squared > 0.7 else "moderate" if r_squared > 0.5 else "weak"
            
            # Calculate volatility (standard deviation relative to mean)
            std_dev = float(df['value'].std())
            volatility = (std_dev / mean_value) if mean_value != 0 else 0
            volatility_level = "high" if volatility > 0.15 else "medium" if volatility > 0.05 else "low"
            
            return {
                "latest_value": latest_value,
                "mean_value": mean_value,
                "min_value": min_value,
                "max_value": max_value,
                "pct_change": float(pct_change),
                "direction": direction,
                "strength": strength,
                "r_squared": r_squared,
                "slope": slope,
                "volatility": float(volatility),
                "volatility_level": volatility_level,
                "data_points": len(df)
            }
        
        except Exception as e:
            print(f"Error calculating trend for {kpi_name}: {e}")
            return None
    
    def _detect_anomalies(self, df: pd.DataFrame, kpi_name: str) -> List[Dict[str, Any]]:
        """Detect anomalies in KPI time series using Z-scores"""
        if len(df) < 10:
            return []
        
        anomalies = []
        
        try:
            # Calculate rolling mean and standard deviation
            window = min(10, max(3, len(df) // 5))
            rolling_mean = df['value'].rolling(window=window, center=True).mean()
            rolling_std = df['value'].rolling(window=window, center=True).std()
            
            # Handle NaN values
            rolling_mean = rolling_mean.fillna(df['value'].mean())
            rolling_std = rolling_std.fillna(df['value'].std())
            
            # Calculate Z-scores
            z_scores = (df['value'] - rolling_mean) / rolling_std
            
            # Find anomalies (|Z-score| > 3)
            anomaly_indices = np.where(np.abs(z_scores) > 3)[0]
            
            for idx in anomaly_indices:
                anomalies.append({
                    "timestamp": df['timestamp'].iloc[idx].isoformat(),
                    "value": float(df['value'].iloc[idx]),
                    "expected_value": float(rolling_mean.iloc[idx]),
                    "z_score": float(z_scores.iloc[idx]),
                    "severity": "high" if abs(z_scores.iloc[idx]) > 5 else "medium"
                })
            
            return anomalies
        
        except Exception as e:
            print(f"Error detecting anomalies for {kpi_name}: {e}")
            return []
    
    def _generate_forecast(self, df: pd.DataFrame, kpi_name: str) -> Dict[str, Any]:
        """Generate forecast for a KPI time series using ARIMA"""
        if len(df) < 10:
            return None
        
        try:
            # Resample data to regular intervals if needed
            if len(df) >= 20:
                # Determine appropriate frequency based on data
                date_range = df['timestamp'].max() - df['timestamp'].min()
                if date_range.days > 365:
                    freq = 'M'  # Monthly
                elif date_range.days > 60:
                    freq = 'W'  # Weekly
                else:
                    freq = 'D'  # Daily
                
                # Resample
                df_resampled = df.set_index('timestamp').resample(freq)['value'].mean().reset_index()
                df_resampled = df_resampled.dropna()
                
                if len(df_resampled) >= 10:
                    df = df_resampled
            
            # Prepare data for ARIMA
            y = df['value'].values
            
            # Fit ARIMA model
            # Use auto_arima in production for automatic order selection
            model = ARIMA(y, order=(1, 1, 1))
            model_fit = model.fit()
            
            # Generate forecast (next 5 periods)
            forecast_periods = 5
            forecast = model_fit.forecast(steps=forecast_periods)
            
            # Calculate forecast dates
            last_date = df['timestamp'].iloc[-1]
            forecast_dates = []
            
            # Estimate date increment based on average interval in data
            if len(df) > 1:
                avg_interval = (df['timestamp'].iloc[-1] - df['timestamp'].iloc[0]) / (len(df) - 1)
                for i in range(1, forecast_periods + 1):
                    forecast_dates.append((last_date + avg_interval * i).isoformat())
            else:
                # Fallback to daily increments
                for i in range(1, forecast_periods + 1):
                    forecast_dates.append((last_date + timedelta(days=i)).isoformat())
            
            # Prepare result
            forecast_result = {
                "method": "ARIMA",
                "forecast_values": [float(f) for f in forecast],
                "forecast_dates": forecast_dates,
                "confidence": "medium"  # Simple model, medium confidence
            }
            
            return forecast_result
        
        except Exception as e:
            print(f"Error generating forecast for {kpi_name}: {e}")
            return None
    
    def _calculate_correlations(self, kpi_data: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Calculate correlations between different KPIs"""
        if len(kpi_data) < 2:
            return []
        
        correlations = []
        
        try:
            # Convert all KPIs to DataFrames
            kpi_dfs = {}
            
            for kpi_name, data_points in kpi_data.items():
                df = pd.DataFrame(data_points)
                
                if 'value' in df.columns and 'timestamp' in df.columns:
                    df['timestamp'] = pd.to_datetime(df['timestamp'])
                    df = df.sort_values('timestamp')
                    kpi_dfs[kpi_name] = df
            
            # Calculate correlations for all pairs
            kpi_names = list(kpi_dfs.keys())
            
            for i in range(len(kpi_names)):
                for j in range(i+1, len(kpi_names)):
                    kpi1 = kpi_names[i]
                    kpi2 = kpi_names[j]
                    
                    df1 = kpi_dfs[kpi1]
                    df2 = kpi_dfs[kpi2]
                    
                    # Merge on nearest timestamps
                    df1['date'] = df1['timestamp'].dt.date
                    df2['date'] = df2['timestamp'].dt.date
                    
                    merged = pd.merge(df1[['date', 'value']], df2[['date', 'value']], 
                                    on='date', suffixes=('_1', '_2'))
                    
                    # Calculate correlation if enough common data points
                    if len(merged) >= 5:
                        corr = float(merged['value_1'].corr(merged['value_2']))
                        
                        # Only include strong correlations
                        if abs(corr) >= 0.5:
                            correlations.append({
                                "kpi1": kpi1,
                                "kpi2": kpi2,
                                "correlation": corr,
                                "direction": "positive" if corr > 0 else "negative",
                                "strength": "strong" if abs(corr) > 0.7 else "moderate",
                                "data_points": len(merged)
                            })
            
            return correlations
        
        except Exception as e:
            print(f"Error calculating correlations: {e}")
            return []

class ResourceUtilizationAnalyzer:
    """Analyze and forecast resource utilization for the administrative dashboard"""
    
    def __init__(self, data_path: str = "resource_data"):
        self.data_path = data_path
        
        # Create data directory if it doesn't exist
        os.makedirs(data_path, exist_ok=True)
    
    def analyze_utilization(self, utilization_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Analyze resource utilization data
        
        Args:
            utilization_data: Dictionary mapping resource IDs to lists of utilization data points
            
        Returns:
            Dictionary with utilization analysis results
        """
        results = {
            "summary": {},
            "peak_periods": [],
            "bottlenecks": [],
            "optimization_opportunities": []
        }
        
        # Process each resource
        resource_summaries = {}
        all_utilization = []
        
        for resource_id, data_points in utilization_data.items():
            # Convert to DataFrame
            try:
                df = pd.DataFrame(data_points)
                
                # Ensure required columns
                if 'utilization' not in df.columns or 'timestamp' not in df.columns:
                    continue
                
                # Convert timestamp to datetime
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                
                # Sort by timestamp
                df = df.sort_values('timestamp')
                
                # Calculate summary statistics
                avg_util = float(df['utilization'].mean())
                max_util = float(df['utilization'].max())
                min_util = float(df['utilization'].min())
                latest_util = float(df['utilization'].iloc[-1])
                
                # Calculate utilization trend
                trend = "stable"
                if len(df) >= 3:
                    # Simple trend based on first vs last third
                    first_third = df['utilization'].iloc[:len(df)//3].mean()
                    last_third = df['utilization'].iloc[-len(df)//3:].mean()
                    
                    if last_third > first_third * 1.1:
                        trend = "increasing"
                    elif last_third < first_third * 0.9:
                        trend = "decreasing"
                
                # Store resource summary
                resource_summaries[resource_id] = {
                    "avg_utilization": avg_util,
                    "max_utilization": max_util,
                    "min_utilization": min_util,
                    "latest_utilization": latest_util,
                    "trend": trend,
                    "data_points": len(df)
                }
                
                # Add to all utilization for overall analysis
                df['resource_id'] = resource_id
                all_utilization.append(df)
                
                # Identify potential bottlenecks
                if max_util > 0.9:  # 90% utilization
                    results["bottlenecks"].append({
                        "resource_id": resource_id,
                        "max_utilization": max_util,
                        "avg_utilization": avg_util,
                        "frequency": float(np.mean(df['utilization'] > 0.8))  # How often above 80%
                    })
                
                # Identify optimization opportunities (low utilization)
                if avg_util < 0.4 and max_util < 0.7:  # Consistently low utilization
                    results["optimization_opportunities"].append({
                        "resource_id": resource_id,
                        "avg_utilization": avg_util,
                        "max_utilization": max_util,
                        "potential_savings": "high" if avg_util < 0.3 else "medium"
                    })
            
            except Exception as e:
                print(f"Error analyzing resource {resource_id}: {e}")
        
        # Store resource summaries
        results["summary"] = resource_summaries
        
        # Identify peak periods across all resources
        if all_utilization:
            try:
                # Combine all utilization data
                all_df = pd.concat(all_utilization)
                
                # Group by timestamp and calculate average utilization
                time_series = all_df.groupby('timestamp')['utilization'].mean().reset_index()
                
                if len(time_series) >= 10:
                    # Find peaks using rolling statistics
                    window = min(5, max(3, len(time_series) // 10))
                    rolling_mean = time_series['utilization'].rolling(window=window).mean()
                    rolling_std = time_series['utilization'].rolling(window=window).std()
                    
                    # Define peaks as periods above mean + 1.5*std
                    threshold = rolling_mean + 1.5 * rolling_std
                    peaks = time_series[time_series['utilization'] > threshold]
                    
                    # Group consecutive peaks
                    if len(peaks) > 0:
                        peak_groups = []
                        current_group = [peaks.iloc[0]]
                        
                        for i in range(1, len(peaks)):
                            current_row = peaks.iloc[i]
                            prev_row = peaks.iloc[i-1]
                            
                            # Check if timestamps are consecutive
                            time_diff = (current_row['timestamp'] - prev_row['timestamp']).total_seconds()
                            
                            if time_diff <= 86400:  # Within 1 day
                                current_group.append(current_row)
                            else:
                                peak_groups.append(current_group)
                                current_group = [current_row]
                        
                        if current_group:
                            peak_groups.append(current_group)
                        
                        # Convert peak groups to result format
                        for group in peak_groups:
                            group_df = pd.DataFrame(group)
                            
                            results["peak_periods"].append({
                                "start_time": group_df['timestamp'].min().isoformat(),
                                "end_time": group_df['timestamp'].max().isoformat(),
                                "avg_utilization": float(group_df['utilization'].mean()),
                                "max_utilization": float(group_df['utilization'].max()),
                                "duration_hours": (group_df['timestamp'].max() - group_df['timestamp'].min()).total_seconds() / 3600
                            })
            
            except Exception as e:
                print(f"Error identifying peak periods: {e}")
        
        return results
    
    def forecast_utilization(self, historical_data: Dict[str, List[Dict[str, Any]]], 
                           forecast_days: int = 30) -> Dict[str, Any]:
        """
        Forecast future resource utilization
        
        Args:
            historical_data: Dictionary mapping resource IDs to lists of utilization data points
            forecast_days: Number of days to forecast
            
        Returns:
            Dictionary with utilization forecasts
        """
        forecasts = {}
        
        # Process each resource
        for resource_id, data_points in historical_data.items():
            # Convert to DataFrame
            try:
                df = pd.DataFrame(data_points)
                
                # Ensure required columns
                if 'utilization' not in df.columns or 'timestamp' not in df.columns:
                    continue
                
                # Convert timestamp to datetime
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                
                # Sort by timestamp and remove duplicates
                df = df.sort_values('timestamp')
                df = df.drop_duplicates(subset=['timestamp'])
                
                # Need sufficient data for forecasting
                if len(df) < 10:
                    continue
                
                # Resample to daily frequency if data spans multiple days
                date_range = df['timestamp'].max() - df['timestamp'].min()
                
                if date_range.days > 7:
                    df_resampled = df.set_index('timestamp').resample('D')['utilization'].mean().reset_index()
                    df_resampled = df_resampled.dropna()
                    
                    if len(df_resampled) >= 7:
                        df = df_resampled
                
                # Prepare data for time series model
                y = df['utilization'].values
                
                # Determine appropriate model based on data characteristics
                # For simplicity, using ARIMA for all cases
                # In production, would select model based on data patterns
                
                # Fit ARIMA model
                model = ARIMA(y, order=(1, 1, 1))
                model_fit = model.fit()
                
                # Generate forecast
                forecast_values = model_fit.forecast(steps=forecast_days)
                
                # Generate forecast dates
                last_date = df['timestamp'].iloc[-1]
                forecast_dates = [(last_date + timedelta(days=i+1)).isoformat() for i in range(forecast_days)]
                
                # Ensure values are within valid range (0 to 1 for utilization)
                forecast_values = np.clip(forecast_values, 0, 1)
                
                # Calculate confidence intervals (simplified)
                std_err = np.std(y) * 1.5
                lower_bounds = np.clip(forecast_values - std_err, 0, 1)
                upper_bounds = np.clip(forecast_values + std_err, 0, 1)
                
                # Store forecast
                forecasts[resource_id] = {
                    "dates": forecast_dates,
                    "values": [float(v) for v in forecast_values],
                    "lower_bounds": [float(v) for v in lower_bounds],
                    "upper_bounds": [float(v) for v in upper_bounds],
                    "peak_dates": [forecast_dates[i] for i in range(len(forecast_values)) 
                                  if forecast_values[i] > 0.8],
                    "method": "ARIMA"
                }
            
            except Exception as e:
                print(f"Error forecasting utilization for resource {resource_id}: {e}")
        
        # Generate overall forecast by averaging individual forecasts
        if len(forecasts) > 0:
            all_forecasts = []
            
            for resource_id, forecast in forecasts.items():
                values = forecast["values"]
                
                # Ensure all forecasts have same length
                if len(values) == forecast_days:
                    all_forecasts.append(values)
            
            if all_forecasts:
                # Calculate average forecast across all resources
                avg_forecast = np.mean(all_forecasts, axis=0)
                std_forecast = np.std(all_forecasts, axis=0)
                
                # Use first resource's dates (should be the same for all)
                first_resource = next(iter(forecasts))
                forecast_dates = forecasts[first_resource]["dates"]
                
                # Store overall forecast
                forecasts["overall"] = {
                    "dates": forecast_dates,
                    "values": [float(v) for v in avg_forecast],
                    "lower_bounds": [float(max(0, v - s)) for v, s in zip(avg_forecast, std_forecast)],
                    "upper_bounds": [float(min(1, v + s)) for v, s in zip(avg_forecast, std_forecast)],
                    "peak_dates": [forecast_dates[i] for i in range(len(avg_forecast)) 
                                  if avg_forecast[i] > 0.8],
                    "method": "Aggregate",
                    "resources_count": len(forecasts) - 1  # Exclude "overall"
                }
        
        return forecasts

class TrainingAnalyticsEngine:
    """Advanced analytics engine for training programs and performance metrics"""
    
    def __init__(self, data_path: str = "training_analytics"):
        self.data_path = data_path
        
        # Create data directory if it doesn't exist
        os.makedirs(data_path, exist_ok=True)
    
    def analyze_trainee_performance(self, performance_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze trainee performance data
        
        Args:
            performance_data: List of trainee performance records
            
        Returns:
            Dictionary with performance analysis results
        """
        if not performance_data:
            return {"status": "error", "message": "No performance data provided"}
        
        try:
            # Convert to DataFrame
            df = pd.DataFrame(performance_data)
            
            # Verify required columns
            required_cols = ['trainee_id', 'score', 'module_id', 'timestamp']
            if not all(col in df.columns for col in required_cols):
                return {"status": "error", "message": "Missing required columns in performance data"}
            
            # Convert timestamp to datetime
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # Initialize results
            results = {
                "summary": {},
                "by_trainee": {},
                "by_module": {},
                "trends": {},
                "bottlenecks": [],
                "top_performers": [],
                "struggling_trainees": []
            }
            
            # Overall summary statistics
            results["summary"] = {
                "avg_score": float(df['score'].mean()),
                "median_score": float(df['score'].median()),
                "min_score": float(df['score'].min()),
                "max_score": float(df['score'].max()),
                "std_dev": float(df['score'].std()),
                "trainee_count": df['trainee_id'].nunique(),
                "module_count": df['module_id'].nunique(),
                "record_count": len(df)
            }
            
            # Analysis by trainee
            trainee_stats = df.groupby('trainee_id').agg({
                'score': ['mean', 'median', 'min', 'max', 'std', 'count']
            }).reset_index()
            
            # Flatten multi-level columns
            trainee_stats.columns = ['_'.join(col).strip('_') for col in trainee_stats.columns.values]
            
            # Convert to dictionary format
            for _, row in trainee_stats.iterrows():
                trainee_id = row['trainee_id']
                results["by_trainee"][trainee_id] = {
                    "avg_score": float(row['score_mean']),
                    "median_score": float(row['score_median']),
                    "min_score": float(row['score_min']),
                    "max_score": float(row['score_max']),
                    "std_dev": float(row['score_std']) if not pd.isna(row['score_std']) else 0.0,
                    "record_count": int(row['score_count'])
                }
            
            # Analysis by module
            module_stats = df.groupby('module_id').agg({
                'score': ['mean', 'median', 'min', 'max', 'std', 'count']
            }).reset_index()
            
            # Flatten multi-level columns
            module_stats.columns = ['_'.join(col).strip('_') for col in module_stats.columns.values]
            
            # Convert to dictionary format
            for _, row in module_stats.iterrows():
                module_id = row['module_id']
                results["by_module"][module_id] = {
                    "avg_score": float(row['score_mean']),
                    "median_score": float(row['score_median']),
                    "min_score": float(row['score_min']),
                    "max_score": float(row['score_max']),
                    "std_dev": float(row['score_std']) if not pd.isna(row['score_std']) else 0.0,
                    "record_count": int(row['score_count'])
                }
            
            # Identify bottleneck modules (consistently low scores)
            module_stats['relative_score'] = module_stats['score_mean'] / results["summary"]["avg_score"]
            bottlenecks = module_stats[module_stats['relative_score'] < 0.85].sort_values('score_mean')
            
            for _, row in bottlenecks.iterrows():
                results["bottlenecks"].append({
                    "module_id": row['module_id'],
                    "avg_score": float(row['score_mean']),
                    "relative_score": float(row['relative_score']),
                    "record_count": int(row['score_count'])
                })
            
            # Identify top performers
            min_records = 3  # Minimum records to qualify
            top_trainees = trainee_stats[trainee_stats['score_count'] >= min_records].sort_values('score_mean', ascending=False).head(5)
            
            for _, row in top_trainees.iterrows():
                results["top_performers"].append({
                    "trainee_id": row['trainee_id'],
                    "avg_score": float(row['score_mean']),
                    "record_count": int(row['score_count'])
                })
            
            # Identify struggling trainees
            threshold = results["summary"]["avg_score"] * 0.8
            struggling = trainee_stats[(trainee_stats['score_count'] >= min_records) & 
                                      (trainee_stats['score_mean'] < threshold)].sort_values('score_mean')
            
            for _, row in struggling.iterrows():
                results["struggling_trainees"].append({
                    "trainee_id": row['trainee_id'],
                    "avg_score": float(row['score_mean']),
                    "record_count": int(row['score_count'])
                })
            
            # Analyze temporal trends if sufficient data
            if df['timestamp'].nunique() >= 5:
                # Group by time periods
                date_range = df['timestamp'].max() - df['timestamp'].min()
                
                if date_range.days > 90:
                    # Monthly aggregation
                    df['period'] = df['timestamp'].dt.to_period('M')
                elif date_range.days > 14:
                    # Weekly aggregation
                    df['period'] = df['timestamp'].dt.to_period('W')
                else:
                    # Daily aggregation
                    df['period'] = df['timestamp'].dt.to_period('D')
                
                # Convert period to string for JSON serialization
                df['period_str'] = df['period'].astype(str)
                
                # Calculate statistics by period
                period_stats = df.groupby('period_str').agg({
                    'score': ['mean', 'count'],
                    'trainee_id': 'nunique'
                }).reset_index()
                
                # Flatten multi-level columns
                period_stats.columns = ['_'.join(col).strip('_') for col in period_stats.columns.values]
                
                # Sort by period
                period_stats = period_stats.sort_values('period_str')
                
                # Store trend data
                results["trends"] = {
                    "periods": period_stats['period_str'].tolist(),
                    "avg_scores": [float(v) for v in period_stats['score_mean'].tolist()],
                    "trainee_counts": [int(v) for v in period_stats['trainee_id_nunique'].tolist()],
                    "record_counts": [int(v) for v in period_stats['score_count'].tolist()]
                }
                
                # Calculate trend direction
                if len(period_stats) >= 3:
                    x = np.arange(len(period_stats))
                    y = period_stats['score_mean'].values
                    
                    try:
                        slope, _, r_value, _, _ = stats.linregress(x, y)
                        
                        if abs(r_value) >= 0.5:
                            results["trends"]["direction"] = "improving" if slope > 0 else "declining"
                            results["trends"]["trend_strength"] = "strong" if abs(r_value) > 0.7 else "moderate"
                        else:
                            results["trends"]["direction"] = "stable"
                            results["trends"]["trend_strength"] = "weak"
                    except:
                        results["trends"]["direction"] = "undetermined"
            
            return results
        
        except Exception as e:
            return {"status": "error", "message": f"Error analyzing performance data: {str(e)}"}
    
    def compare_cohort_performance(self, cohort1_data: List[Dict[str, Any]], 
                                  cohort2_data: List[Dict[str, Any]],
                                  cohort1_name: str = "Cohort 1",
                                  cohort2_name: str = "Cohort 2") -> Dict[str, Any]:
        """
        Compare performance between two trainee cohorts
        
        Args:
            cohort1_data: Performance data for first cohort
            cohort2_data: Performance data for second cohort
            cohort1_name: Name for first cohort
            cohort2_name: Name for second cohort
            
        Returns:
            Dictionary with cohort comparison results
        """
        if not cohort1_data or not cohort2_data:
            return {"status": "error", "message": "Insufficient data for comparison"}
        
        try:
            # Convert to DataFrames
            df1 = pd.DataFrame(cohort1_data)
            df2 = pd.DataFrame(cohort2_data)
            
            # Verify required columns
            required_cols = ['score', 'module_id']
            if not all(col in df1.columns and col in df2.columns for col in required_cols):
                return {"status": "error", "message": "Missing required columns in cohort data"}
            
            # Calculate overall statistics
            cohort1_stats = {
                "avg_score": float(df1['score'].mean()),
                "median_score": float(df1['score'].median()),
                "std_dev": float(df1['score'].std()),
                "sample_size": len(df1)
            }
            
            cohort2_stats = {
                "avg_score": float(df2['score'].mean()),
                "median_score": float(df2['score'].median()),
                "std_dev": float(df2['score'].std()),
                "sample_size": len(df2)
            }
            
            # Calculate differences
            score_diff = cohort2_stats["avg_score"] - cohort1_stats["avg_score"]
            percent_diff = (score_diff / cohort1_stats["avg_score"]) * 100 if cohort1_stats["avg_score"] != 0 else 0
            
            # Perform statistical comparison
            try:
                from scipy import stats
                t_stat, p_value = stats.ttest_ind(df1['score'], df2['score'], equal_var=False)
                
                significance = "high" if p_value < 0.01 else "medium" if p_value < 0.05 else "low"
                statistically_significant = p_value < 0.05
            except:
                t_stat, p_value = 0, 1
                significance = "undetermined"
                statistically_significant = False
            
            # Module-level comparison
            common_modules = set(df1['module_id'].unique()).intersection(set(df2['module_id'].unique()))
            module_comparisons = []
            
            for module in common_modules:
                module_df1 = df1[df1['module_id'] == module]
                module_df2 = df2[df2['module_id'] == module]
                
                if len(module_df1) >= 3 and len(module_df2) >= 3:
                    module_diff = module_df2['score'].mean() - module_df1['score'].mean()
                    module_pct_diff = (module_diff / module_df1['score'].mean()) * 100 if module_df1['score'].mean() != 0 else 0
                    
                    try:
                        module_t, module_p = stats.ttest_ind(module_df1['score'], module_df2['score'], equal_var=False)
                        module_significant = module_p < 0.05
                    except:
                        module_t, module_p = 0, 1
                        module_significant = False
                    
                    module_comparisons.append({
                        "module_id": module,
                        "cohort1_avg": float(module_df1['score'].mean()),
                        "cohort2_avg": float(module_df2['score'].mean()),
                        "difference": float(module_diff),
                        "percent_difference": float(module_pct_diff),
                        "sample_sizes": [len(module_df1), len(module_df2)],
                        "p_value": float(module_p),
                        "statistically_significant": module_significant
                    })
            
            # Sort module comparisons by absolute difference
            module_comparisons.sort(key=lambda x: abs(x["difference"]), reverse=True)
            
            return {
                "cohort1": {
                    "name": cohort1_name,
                    "stats": cohort1_stats
                },
                "cohort2": {
                    "name": cohort2_name,
                    "stats": cohort2_stats
                },
                "comparison": {
                    "absolute_difference": float(score_diff),
                    "percent_difference": float(percent_diff),
                    "t_statistic": float(t_stat),
                    "p_value": float(p_value),
                    "significance": significance,
                    "statistically_significant": statistically_significant,
                    "better_performing": cohort2_name if score_diff > 0 else (cohort1_name if score_diff < 0 else "Equal"),
                    "performance_gap": "large" if abs(percent_diff) > 15 else "medium" if abs(percent_diff) > 5 else "small"
                },
                "module_comparisons": module_comparisons
            }
        
        except Exception as e:
            return {"status": "error", "message": f"Error comparing cohorts: {str(e)}"}
    
    def analyze_completion_trends(self, completion_data: List[Dict[str, Any]], 
                                 program_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze training completion trends
        
        Args:
            completion_data: List of training completion records
            program_type: Optional program type to filter data
            
        Returns:
            Dictionary with completion trend analysis
        """
        if not completion_data:
            return {"status": "error", "message": "No completion data provided"}
        
        try:
            # Convert to DataFrame
            df = pd.DataFrame(completion_data)
            
            # Verify required columns
            required_cols = ['trainee_id', 'completion_date', 'program_type']
            if not all(col in df.columns for col in required_cols):
                return {"status": "error", "message": "Missing required columns in completion data"}
            
            # Filter by program type if specified
            if program_type:
                df = df[df['program_type'] == program_type]
                
                if len(df) == 0:
                    return {"status": "error", "message": f"No data found for program type: {program_type}"}
            
            # Convert completion_date to datetime
            df['completion_date'] = pd.to_datetime(df['completion_date'])
            
            # Calculate date range
            date_range = df['completion_date'].max() - df['completion_date'].min()
            
            # Determine appropriate time aggregation
            if date_range.days > 365 * 2:
                # Quarterly for multi-year data
                df['period'] = df['completion_date'].dt.to_period('Q')
                period_type = "quarter"
            elif date_range.days > 180:
                # Monthly for 6+ months
                df['period'] = df['completion_date'].dt.to_period('M')
                period_type = "month"
            elif date_range.days > 30:
                # Weekly for 1+ month
                df['period'] = df['completion_date'].dt.to_period('W')
                period_type = "week"
            else:
                # Daily for short periods
                df['period'] = df['completion_date'].dt.to_period('D')
                period_type = "day"
            
            # Convert period to string for JSON serialization
            df['period_str'] = df['period'].astype(str)
            
            # Aggregate completions by period
            completions_by_period = df.groupby('period_str').agg({
                'trainee_id': 'count'
            }).reset_index()
            
            completions_by_period.rename(columns={'trainee_id': 'completions'}, inplace=True)
            
            # Sort by period
            completions_by_period = completions_by_period.sort_values('period_str')
            
            # Calculate statistics
            total_completions = int(completions_by_period['completions'].sum())
            avg_completions = float(completions_by_period['completions'].mean())
            max_completions = int(completions_by_period['completions'].max())
            min_completions = int(completions_by_period['completions'].min())
            
            # Calculate trend
            if len(completions_by_period) >= 3:
                x = np.arange(len(completions_by_period))
                y = completions_by_period['completions'].values
                
                try:
                    from scipy import stats
                    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
                    
                    if abs(r_value) >= 0.5:
                        trend_direction = "increasing" if slope > 0 else "decreasing"
                        trend_strength = "strong" if abs(r_value) > 0.7 else "moderate"
                    else:
                        trend_direction = "stable"
                        trend_strength = "weak"
                except:
                    trend_direction = "undetermined"
                    trend_strength = "weak"
                    slope = 0
            else:
                trend_direction = "insufficient_data"
                trend_strength = "undetermined"
                slope = 0
            
            # Format results
            results = {
                "period_type": period_type,
                "total_completions": total_completions,
                "periods": completions_by_period['period_str'].tolist(),
                "completions": completions_by_period['completions'].tolist(),
                "statistics": {
                    "average_per_period": avg_completions,
                    "maximum_per_period": max_completions,
                    "minimum_per_period": min_completions
                },
                "trend": {
                    "direction": trend_direction,
                    "strength": trend_strength,
                    "slope": float(slope)  # Change per period
                }
            }
            
            # Add program type information if filtered
            if program_type:
                results["program_type"] = program_type
            
            return results
        
        except Exception as e:
            return {"status": "error", "message": f"Error analyzing completion trends: {str(e)}"}

# Unit tests for KpiAnalyzer
# /dashboard/ml/tests/test_kpi_analyzer.py
import unittest
import tempfile
import os
import pandas as pd
from datetime import datetime, timedelta
from dashboard.ml.kpi_analyzer import KpiAnalyzer

class TestKpiAnalyzer(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.analyzer = KpiAnalyzer(data_path=self.temp_dir)
        
        # Generate test data
        self.test_data = {
            "completion_rate": [
                {"timestamp": (datetime.now() - timedelta(days=n)).isoformat(), "value": 0.8 + 0.01 * n} 
                for n in range(20, 0, -1)
            ],
            "training_hours": [
                {"timestamp": (datetime.now() - timedelta(days=n)).isoformat(), "value": 120 - n} 
                for n in range(20, 0, -1)
            ]
        }
    
    def tearDown(self):
        for f in os.listdir(self.temp_dir):
            os.remove(os.path.join(self.temp_dir, f))
        os.rmdir(self.temp_dir)
    
    def test_analyze_kpi_trends(self):
        result = self.analyzer.analyze_kpi_trends(self.test_data)
        
        # Verify overall structure
        self.assertIn("trends", result)
        self.assertIn("anomalies", result)
        self.assertIn("correlations", result)
        self.assertIn("forecasts", result)
        
        # Verify trends for completion_rate
        self.assertIn("completion_rate", result["trends"])
        trend = result["trends"]["completion_rate"]
        self.assertIn("direction", trend)
        self.assertIn("strength", trend)
        
        # Verify forecasts
        if "completion_rate" in result["forecasts"]:
            forecast = result["forecasts"]["completion_rate"]
            self.assertIn("forecast_values", forecast)
            self.assertIn("forecast_dates", forecast)
            
            # Check forecast values
            self.assertEqual(len(forecast["forecast_values"]), len(forecast["forecast_dates"]))
    
    def test_analyze_kpi_trends_with_anomaly(self):
        # Add an anomaly
        anomaly_data = self.test_data.copy()
        anomaly_data["completion_rate"].append({
            "timestamp": datetime.now().isoformat(), 
            "value": 0.2  # Significantly lower than trend
        })
        
        result = self.analyzer.analyze_kpi_trends(anomaly_data)
        
        # Verify anomalies detected
        self.assertIn("completion_rate", result["anomalies"])
        anomalies = result["anomalies"]["completion_rate"]
        self.assertTrue(len(anomalies) > 0)

# Unit tests for SessionReplayService
// /debriefing/tests/SessionReplayServiceTest.cc
#include <gtest/gtest.h>
#include "../services/SessionReplayService.h"

using namespace debriefing;

class SessionReplayServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        service_ = std::make_shared<SessionReplayService>();
    }

    std::shared_ptr<SessionReplayService> service_;
};

TEST_F(SessionReplayServiceTest, CreateReplaySession) {
    std::string trainingSessionId = "training-123";
    std::string pilotId = "pilot-456";
    std::string instructorId = "instructor-789";
    
    Json::Value dataSources;
    Json::Value dataSource1;
    dataSource1["type"] = "flight_data";
    dataSource1["sourceId"] = "data-123";
    Json::Value dataSource2;
    dataSource2["type"] = "biometric";
    dataSource2["sourceId"] = "data-456";
    
    dataSources.append(dataSource1);
    dataSources.append(dataSource2);
    
    Json::Value result = service_->createReplaySession(trainingSessionId, pilotId, instructorId, dataSources);
    
    // Verify structure of result
    EXPECT_TRUE(result.isObject());
    EXPECT_TRUE(result.isMember("id"));
    EXPECT_TRUE(result.isMember("trainingSessionId"));
    EXPECT_EQ(result["trainingSessionId"].asString(), trainingSessionId);
    EXPECT_TRUE(result.isMember("pilotId"));
    EXPECT_EQ(result["pilotId"].asString(), pilotId);
    EXPECT_TRUE(result.isMember("instructorId"));
    EXPECT_EQ(result["instructorId"].asString(), instructorId);
    EXPECT_TRUE(result.isMember("dataSources"));
    EXPECT_EQ(result["dataSources"].size(), 2);
}

TEST_F(SessionReplayServiceTest, GetReplaySession) {
    // First create a session
    std::string trainingSessionId = "training-123";
    std::string pilotId = "pilot-456";
    std::string instructorId = "instructor-789";
    
    Json::Value dataSources;
    Json::Value dataSource;
    dataSource["type"] = "flight_data";
    dataSource["sourceId"] = "data-123";
    dataSources.append(dataSource);
    
    Json::Value createdSession = service_->createReplaySession(trainingSessionId, pilotId, instructorId, dataSources);
    
    // Get the session id
    std::string sessionId = createdSession["id"].asString();
    
    // Get the session
    Json::Value result = service_->getReplaySession(sessionId);
    
    // Verify structure of result
    EXPECT_TRUE(result.isObject());
    EXPECT_TRUE(result.isMember("id"));
    EXPECT_EQ(result["id"].asString(), sessionId);
    EXPECT_TRUE(result.isMember("trainingSessionId"));
    EXPECT_EQ(result["trainingSessionId"].asString(), trainingSessionId);
}
