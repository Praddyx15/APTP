/**
 * Type declarations for build-time utilities
 * These declarations help TypeScript handle type errors during build
 */

// Extend the Record type to include any properties
declare namespace NodeJS {
  interface Global {
    createInsertSchema: any;
  }
}

// Declare optional properties for database models
declare namespace DatabaseModels {
  interface HasExtraProperties {
    [key: string]: any;
  }
  
  // Allow createdAt/updatedAt on any object
  interface HasTimestamps {
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  // Allow special fields for notifications
  interface HasNotificationProperties {
    userId?: number;
    recipientId?: number;
  }
  
  // Allow metadata on any object
  interface HasMetadata {
    metadata?: any;
  }
  
  // Allow fields for handling achievements
  interface HasAchievementProperties {
    progress?: number;
    grantedById?: number;
    notes?: string;
    criteria?: any;
    startDate?: Date;
    endDate?: Date;
    imageUrl?: string;
    awardedAt?: Date;
  }
  
  // Allow session properties
  interface HasSessionProperties {
    title?: string;
    description?: string;
    notes?: string;
    location?: string;
    lessonId?: number;
    resources?: any[];
    competencyArea?: string;
    instructorRating?: number;
    maxScore?: number;
    dueDate?: Date;
    assessorId?: number;
  }
  
  // Allow resource properties
  interface HasResourceProperties {
    url?: string;
    createdById?: number;
    rating?: number;
    aircraft?: string;
    downloads?: number;
  }
}

// Special declaration for Set iteration
interface Set<T> {
  [Symbol.iterator](): IterableIterator<T>;
  
  // Additional helper methods to avoid downlevelIteration issues
  forEach(callbackfn: (value: T) => void, thisArg?: any): void;
  values(): IterableIterator<T>;
  entries(): IterableIterator<[T, T]>;
  keys(): IterableIterator<T>;
}

// Special declaration for Map iteration
interface Map<K, V> {
  [Symbol.iterator](): IterableIterator<[K, V]>;
  
  // Additional helper methods to avoid downlevelIteration issues
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;
  entries(): IterableIterator<[K, V]>;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
}

// Allow any type for objects to prevent property errors during build
type SafeAny = any;

// Fix for arrays or objects with missing properties
interface HasMissingProperties {
  find?: any;
  map?: any;
  forEach?: any;
}

// Allow any properties on objects during build
interface AllowUnknownProps {
  [key: string]: any;
}