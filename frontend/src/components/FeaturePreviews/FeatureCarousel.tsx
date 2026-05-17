import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TransactionsPreview from "./TransactionsPreview";
import BudgetsPreview from "./BudgetsPreview";
import ChartsPreview from "./ChartsPreview";
import GoalsPreview from "./GoalsPreview";

const features = [
  { id: "transactions", label: "Transactions", component: TransactionsPreview },
  { id: "budgets", label: "Budgets", component: BudgetsPreview },
  { id: "charts", label: "Charts", component: ChartsPreview },
  { id: "goals", label: "Goals", component: GoalsPreview },
];

export default function FeatureCarousel() {
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [autoplay]);

  const next = () => {
    setCurrent((prev) => (prev + 1) % features.length);
    setAutoplay(false);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + features.length) % features.length);
    setAutoplay(false);
  };

  const CurrentComponent = features[current].component;

  return (
    <div className="w-full">
      {/* Carousel Container */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <CurrentComponent />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <button
          onClick={prev}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 p-2 rounded-full bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors z-20"
          aria-label="Previous feature"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        <button
          onClick={next}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 p-2 rounded-full bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors z-20"
          aria-label="Next feature"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {features.map((_, index) => (
          <motion.button
            key={index}
            onClick={() => {
              setCurrent(index);
              setAutoplay(false);
            }}
            className={`h-2 rounded-full transition-all ${
              index === current
                ? "w-8 bg-gray-900 dark:bg-gray-100"
                : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
            }`}
            whileHover={{ scale: 1.1 }}
            aria-label={`Go to ${features[index].label} feature`}
          />
        ))}
      </div>

      {/* Feature Labels */}
      <div className="flex justify-center gap-2 mt-4 flex-wrap">
        {features.map((feature, index) => (
          <motion.button
            key={feature.id}
            onClick={() => {
              setCurrent(index);
              setAutoplay(false);
            }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              index === current
                ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                : "bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {feature.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
