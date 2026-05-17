import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
}

const mockTransactions: Transaction[] = [
  { id: '1', type: 'expense', category: 'food', amount: 12.50, note: 'Lunch' },
  { id: '2', type: 'expense', category: 'drinks', amount: 5.75, note: 'Coffee' },
  { id: '3', type: 'income', category: 'salary', amount: 3500, note: 'Monthly income' },
  { id: '4', type: 'expense', category: 'gym', amount: 45, note: 'Membership' },
];

export default function TransactionsPreview() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5 },
    },
  };

  const totalExpense = mockTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = mockTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      {/* Decorative gradient blur */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-300/20 dark:bg-cyan-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">
            Track Income & Expenses
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your financial flow
          </p>
        </div>

        {/* Summary Stats */}
        <motion.div
          className="grid grid-cols-2 gap-3 mb-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-lg p-3 border border-emerald-200/50 dark:border-emerald-700/50"
            variants={itemVariants}
          >
            <div className="text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-medium">
              Income
            </div>
            <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              ${totalIncome.toFixed(2)}
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-lg p-3 border border-orange-200/50 dark:border-orange-700/50"
            variants={itemVariants}
          >
            <div className="text-xs text-orange-700 dark:text-orange-400 mb-1 font-medium">
              Expenses
            </div>
            <div className="text-sm font-bold text-orange-700 dark:text-orange-300">
              -${totalExpense.toFixed(2)}
            </div>
          </motion.div>
        </motion.div>

        {/* Transaction List */}
        <motion.div
          className="space-y-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {mockTransactions.map((tx) => (
            <motion.div
              key={tx.id}
              className="flex items-center justify-between bg-white/40 dark:bg-gray-700/40 rounded-lg p-3 border border-gray-200/30 dark:border-gray-600/30 hover:bg-white/60 dark:hover:bg-gray-700/60 transition-colors"
              variants={itemVariants}
              whileHover={{ x: 4 }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className={`p-2 rounded-lg ${
                    tx.type === 'income'
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-500'
                      : 'bg-gradient-to-br from-orange-400 to-orange-500'
                  }`}
                >
                  {tx.type === 'income' ? (
                    <ArrowDownLeft className="w-4 h-4 text-white" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {tx.category}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {tx.note}
                  </div>
                </div>
              </div>
              <div
                className={`text-sm font-bold whitespace-nowrap ml-2 ${
                  tx.type === 'income'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-orange-600 dark:text-orange-400'
                }`}
              >
                {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
