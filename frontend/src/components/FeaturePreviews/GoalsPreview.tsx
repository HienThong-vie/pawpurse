import { motion } from 'framer-motion';
import { Target } from 'lucide-react';

interface Goal {
  id: string;
  name: string;
  current: number;
  target: number;
  deadline: string;
}

const mockGoals: Goal[] = [
  { id: '1', name: 'Emergency Fund', current: 4300, target: 10000, deadline: '12/31/2026' },
  { id: '2', name: 'Vacation', current: 5000, target: 5000, deadline: '06/30/2026' },
];

export default function GoalsPreview() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const getGoalProgressColor = (percentage: number) => {
    if (percentage < 25) return 'from-red-500 to-red-600 dark:from-red-600 dark:to-red-700';
    if (percentage < 50) return 'from-orange-500 to-yellow-500 dark:from-orange-600 dark:to-yellow-600';
    if (percentage < 75) return 'from-yellow-500 to-green-500 dark:from-yellow-600 dark:to-green-600';
    return 'from-green-500 to-green-600 dark:from-green-600 dark:to-green-700';
  };

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      {/* Decorative gradient blur */}
      <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-gray-300/20 dark:bg-gray-700/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">
            Track Financial Goals
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Achieve your savings targets
          </p>
        </div>

        {/* Goals List */}
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {mockGoals.map((goal) => {
            const percentage = (goal.current / goal.target) * 100;

            return (
              <motion.div
                key={goal.id}
                className="bg-white/40 dark:bg-gray-700/40 rounded-lg p-4 border border-gray-200/30 dark:border-gray-600/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
              >
                {/* Goal Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-600 mt-0.5">
                      <Target className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {goal.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Due: {goal.deadline}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-200">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Amount Info */}
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 ml-11">
                  ${goal.current.toFixed(2)} / ${goal.target.toFixed(2)}
                </div>

                {/* Progress Bar */}
                <div className="relative h-2.5 bg-gray-200/50 dark:bg-gray-600/50 rounded-full overflow-hidden ml-11">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${getGoalProgressColor(percentage)}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 1.2, delay: 0.4 }}
                    viewport={{ once: true }}
                  />
                </div>

                {/* Remaining Amount */}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-11">
                  ${(goal.target - goal.current).toFixed(2)} to go
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
