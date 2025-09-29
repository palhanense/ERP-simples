import { clsx } from "clsx";

export default function NavigationTabs({ navigation, activeView, onChange }) {
  return (
    // single-line navigation: do not wrap; allow horizontal scrolling on very small screens
    <nav className="flex gap-3 overflow-x-auto whitespace-nowrap">
      {navigation.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={clsx(
            "group min-w-[110px] rounded-full border px-4 py-2 text-sm font-medium transition",
            activeView === item.id
              ? "border-outline bg-black text-white dark:border-white dark:bg-white dark:text-black"
              : "border-outline/30 text-neutral-500 hover:border-outline hover:text-text-light dark:border-white/10 dark:text-neutral-400 dark:hover:border-white/30 dark:hover:text-text-dark"
          )}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
