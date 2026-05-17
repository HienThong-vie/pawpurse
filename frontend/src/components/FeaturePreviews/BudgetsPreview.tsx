import { motion } from 'framer-motion';

interface Budget {
  id: string;
  category: string;
  spent: number;
  limit: number;
  period: string;
}

const mockBudgets: Budget[] = [
  { id: '1', category: 'Food', spent: 125.50, limit: 300, period: 'Month' },
  { id: '2', category: 'Drinks', spent: 34, limit: 50, period: 'Week' },
  { id: '3', category: 'Transport', spent: 82, limit: 100, period: 'Week' },
  { id: '4', category: 'Gym', spent: 45, limit: 45, period: 'Month' },
];

export default function BudgetsPreview() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'from-red-500 to-red-600 dark:from-red-600 dark:to-red-700';
    if (percentage >= 80) return 'from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700';
    if (percentage >= 60) return 'from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700';
    return 'from-green-500 to-green-600 dark:from-green-600 dark:to-green-700';
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 dark:text-red-400';
    if (percentage >= 80) return 'text-orange-600 dark:text-orange-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
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
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gray-300/20 dark:bg-gray-700/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">
            Set & Monitor Budgets
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Control your spending limits
          </p>
        </div>

        {/* Budget Items */}
        <motion.div
          className="space-y-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {mockBudgets.map((budget) => {
            const percentage = (budget.spent / budget.limit) * 100;

            return (
              <motion.div
                key={budget.id}
                className="bg-white/40 dark:bg-gray-700/40 rounded-lg p-4 border border-gray-200/30 dark:border-gray-600/30"
                variants={itemVariants}
              >
                {/* Category Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {budget.category}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {budget.period}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      ${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}
                    </div>
                    <div className={`text-sm font-bold ${getPercentageColor(percentage)}`}>
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-2 bg-gray-200/50 dark:bg-gray-600/50 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(percentage)}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    viewport={{ once: true }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
