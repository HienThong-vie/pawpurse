type Strength = 0 | 1 | 2 | 3 | 4;

function scorePassword(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as Strength;
}

const LABELS: Record<Strength, string> = {
  0: "Weak",
  1: "Weak",
  2: "Fair",
  3: "Good",
  4: "Strong",
};

const COLORS: Record<Strength, string> = {
  0: "bg-red-500",
  1: "bg-red-500",
  2: "bg-yellow-500",
  3: "bg-emerald-500",
  4: "bg-emerald-500",
};

function PasswordStrength({ password }: { password: string }) {
  if (password.length === 0) return null;
  const score = scorePassword(password);
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex-1 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? COLORS[score] : "bg-gray-200 dark:bg-[#2a2a2a]"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-[#a0a0a0] w-12 text-right">
        {LABELS[score]}
      </span>
    </div>
  );
}

export default PasswordStrength;
