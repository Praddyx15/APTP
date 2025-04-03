import { useEffect } from 'react';

/**
 * A custom hook to update the document title
 * @param title The title to set (will be appended with app name)
 * @param appName Optional app name to append to title
 */
export function useDocumentTitle(
  title: string,
  appName: string = 'Advanced Pilot Training Platform'
) {
  useEffect(() => {
    // Save the original title to restore on unmount
    const originalTitle = document.title;
    
    // Update the document title
    document.title = title ? `${title} | ${appName}` : appName;
    
    // Restore the original title when the component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [title, appName]);
}