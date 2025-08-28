import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { useBackgroundJobs, BackgroundJob } from '@contexts/BackgroundJobContext';

interface BackgroundJobIndicatorProps {
  style?: any;
}

const BackgroundJobIndicator: React.FC<BackgroundJobIndicatorProps> = ({ 
  style 
}) => {
  const { activeJobs, hasActiveJobs } = useBackgroundJobs();
  const [showDetails, setShowDetails] = useState(false);

  if (!hasActiveJobs) return null;

  const primaryJob = activeJobs[0]; // Show the first active job
  const additionalJobsCount = activeJobs.length - 1;

  const getJobTitle = (job: BackgroundJob) => {
    switch (job.type) {
      case 'generation':
        return 'Creating workout...';
      case 'regeneration':
        return 'Regenerating workout...';
      case 'daily-regeneration':
        return 'Regenerating today...';
      default:
        return 'Processing...';
    }
  };

  const getJobDescription = (job: BackgroundJob) => {
    const progress = Math.round(job.progress);
    const timeLeft = job.estimatedTimeRemaining;
    
    let description = `${progress}% complete`;
    
    if (timeLeft && timeLeft > 0) {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      if (minutes > 0) {
        description += ` • ~${minutes}m ${seconds}s left`;
      } else {
        description += ` • ~${seconds}s left`;
      }
    }
    
    return description;
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowDetails(true)}
        className="bg-primary/10 border border-primary/20 rounded-full px-3 py-2 flex-row items-center"
        style={style}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text className="text-primary text-sm font-medium ml-2">
          {getJobTitle(primaryJob)}
        </Text>
        {additionalJobsCount > 0 && (
          <View className="bg-primary rounded-full w-5 h-5 items-center justify-center ml-2">
            <Text className="text-white text-xs font-bold">
              +{additionalJobsCount}
            </Text>
          </View>
        )}
        <Ionicons 
          name="chevron-up" 
          size={16} 
          color={colors.primary} 
          className="ml-1"
        />
      </TouchableOpacity>

      {/* Details Modal */}
      <Modal
        visible={showDetails}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-text-primary">
                Background Jobs
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetails(false)}
                className="w-8 h-8 items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Job List */}
            <View className="space-y-4">
              {activeJobs.map((job, index) => (
                <View 
                  key={job.id}
                  className="border border-gray-200 rounded-xl p-4"
                >
                  {/* Job Header */}
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-base font-medium text-text-primary">
                      {getJobTitle(job)}
                    </Text>
                    <View className="flex-row items-center">
                      <ActivityIndicator 
                        size="small" 
                        color={colors.primary} 
                      />
                      <Text className="text-sm text-primary font-medium ml-2">
                        {job.status}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View className="w-full h-2 bg-gray-200 rounded-full mb-2">
                    <View
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(10, job.progress)}%` }}
                    />
                  </View>

                  {/* Job Details */}
                  <Text className="text-sm text-text-muted">
                    {getJobDescription(job)}
                  </Text>

                  {/* Job Timestamp */}
                  <Text className="text-xs text-text-muted mt-1">
                    Started {new Date(job.createdAt).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </View>

            {/* Footer */}
            <Text className="text-xs text-text-muted text-center mt-4">
              You can close this and continue using the app. We'll notify you when jobs complete!
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default BackgroundJobIndicator;