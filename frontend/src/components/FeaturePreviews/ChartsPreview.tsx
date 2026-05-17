import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const mockData: ChartData[] = [
  { name: 'Food', value: 125.50, color: '#8b5cf6' },
  { name: 'Gym', value: 45, color: '#f97316' },
  { name: 'Drinks', value: 28.75, color: '#06b6d4' },
  { name: 'Transport', value: 0, color: '#ec4899' },
];

export default function ChartsPreview() {
  const totalSpending = mockData.reduce((sum, item) => sum + item.value, 0);

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
    hidden: { opacity: 0, x: -15 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5 },
    },
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
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-300/20 dark:bg-purple-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">
            Visualize Spending
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            See your expense breakdown
          </p>
        </div>

        {/* Chart Container */}
        <div className="flex flex-col items-center gap-4">
          {/* Donut Chart */}
          <motion.div
            className="w-full h-40"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {mockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Total Spending */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              Total Spending
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              ${totalSpending.toFixed(2)}
            </div>
          </motion.div>

          {/* Legend */}
          <motion.div
            className="w-full space-y-2"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {mockData.map((item) => (
              <motion.div
                key={item.name}
                className="flex items-center justify-between text-sm"
                variants={itemVariants}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shadow-md"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {item.name}
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  ${item.value.toFixed(2)}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
