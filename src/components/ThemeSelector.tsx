import React from "react";
import { Palette } from "lucide-react";

export type ThemeStyle = 'modern' | 'terminal' | 'cleanroom' | 'warm' | 'japanese' | 'japanese_calligraphy' | 'crisp_minimal';

interface ThemeSelectorProps {
  currentTheme: ThemeStyle;
  onChangeTheme: (theme: ThemeStyle) => void;
}

export default function ThemeSelector({ currentTheme, onChangeTheme }: ThemeSelectorProps) {
  const themes: { id: ThemeStyle; name: string; desc: string }[] = [
    {
      id: "modern",
      name: "🚀 Modern Charcoal / Современный темный",
      desc: "Премиальная темная эстетика, четкие контрасты"
    },
    {
      id: "terminal",
      name: "📟 Tech Terminal / Хаки терминал",
      desc: "Индустриальный монохромный консольный стиль"
    },
    {
      id: "cleanroom",
      name: "🔬 Aqua Mint / Клинический светлый",
      desc: "Клинически чистый светлый дизайн"
    },
    {
      id: "warm",
      name: "☕ Warm Minimalist / Теплый бежевый",
      desc: "Уютный бежевый стиль, мягкие шрифты"
    },
    {
      id: "japanese",
      name: "🎋 Japanese Zen / Японский дзен",
      desc: "Бамбуковые тона, песочная бумага и алые печати"
    },
    {
      id: "japanese_calligraphy",
      name: "🌸 Japanese Calligraphy / Сад Сакуры & Кисть",
      desc: "Изящная японская каллиграфия на фоне цветущего сада сакуры"
    },
    {
      id: "crisp_minimal",
      name: "📏 Crisp Minimal / Строгий бумажный",
      desc: "Идеально белый фон и тонкие строгие рамки"
    }
  ];

  const selectedThemeObj = themes.find(t => t.id === currentTheme) || themes[0];

  // custom select styles based on theme
  const getSelectStyles = () => {
    switch (currentTheme) {
      case 'modern':
        return 'bg-zinc-900 border-zinc-700 text-white';
      case 'terminal':
        return 'bg-black border-green-500 text-green-400 font-mono';
      case 'warm':
        return 'bg-[#faf6eb] border-amber-900/20 text-amber-950';
      case 'japanese':
      case 'japanese_calligraphy':
        return 'bg-white border-[#d6cfbe] text-[#2d2d2d]';
      case 'crisp_minimal':
        return 'bg-white border-neutral-300 text-neutral-900';
      case 'cleanroom':
      default:
        return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  return (
    <div className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-dashed bg-white/5 border-neutral-300/30">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-85">
        <Palette className="w-3.5 h-3.5 text-[#bc1c24]" />
        <span>Выбор темы интерфейса</span>
      </div>
      
      <div className="relative">
        <select
          value={currentTheme}
          onChange={(e) => onChangeTheme(e.target.value as ThemeStyle)}
          className={`w-full py-2 px-3 pr-8 rounded-lg border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all cursor-pointer appearance-none ${getSelectStyles()}`}
        >
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id} className="text-black bg-white">
              {theme.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 opacity-60">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
        </div>
      </div>
      
      <span className="text-[10px] opacity-75 leading-tight italic mt-0.5">
        {selectedThemeObj.desc}
      </span>
    </div>
  );
}
