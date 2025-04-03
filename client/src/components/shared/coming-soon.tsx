import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
  returnPath?: string;
  returnLabel?: string;
}

export function ComingSoon({ 
  title, 
  description = "This feature is currently in development and will be available soon.",
  returnPath = "/",
  returnLabel = "Return to Dashboard"
}: ComingSoonProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="w-full h-full min-h-[80vh] flex items-center justify-center">
      <motion.div 
        className="text-center max-w-lg px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={mounted ? { scale: 1, opacity: 1 } : {}}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </motion.div>
        
        <motion.h2 
          className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent"
          initial={{ opacity: 0 }}
          animate={mounted ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className="text-gray-500 dark:text-gray-400 mb-8"
          initial={{ opacity: 0 }}
          animate={mounted ? { opacity: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {description}
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={mounted ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <Button asChild>
            <Link to={returnPath} className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {returnLabel}
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}