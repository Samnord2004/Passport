import React from "react";

export interface MessengerLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official Telegram logo (Sky-blue circular badge with authentic white paper plane)
 */
export const TelegramLogo: React.FC<MessengerLogoProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="tgLogoGrad" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2AABEE" />
        <stop offset="1" stopColor="#229ED9" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="12" fill="url(#tgLogoGrad)" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.42 11.89C9.72 10.02 12.59 8.76 14.02 8.16C18.11 6.46 18.96 6.16 19.51 6.15C19.64 6.15 19.91 6.18 20.09 6.33C20.24 6.45 20.28 6.62 20.3 6.74C20.32 6.86 20.34 7.13 20.32 7.33C20.12 9.45 19.24 14.63 18.8 17.01C18.61 18.01 18.24 18.35 17.89 18.38C17.11 18.45 16.53 17.87 15.77 17.37C14.59 16.6 13.92 16.12 12.78 15.37C11.46 14.5 12.32 14.02 13.07 13.24C13.26 13.04 16.68 9.93 16.74 9.66C16.75 9.63 16.75 9.49 16.67 9.42C16.59 9.35 16.47 9.38 16.38 9.4C16.26 9.43 14.33 10.7 10.6 13.22C10.05 13.6 9.55 13.78 9.11 13.77C8.62 13.76 7.68 13.49 6.98 13.26C6.12 12.98 5.44 12.83 5.5 12.36C5.53 12.11 5.88 11.85 6.55 11.57L5.42 11.89Z"
      fill="white"
    />
  </svg>
);

/**
 * Official VKontakte logo (Distinctive blue squircle with iconic white VK glyph)
 */
export const VkLogo: React.FC<MessengerLogoProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="24" height="24" rx="5.5" fill="#0077FF" />
    <path
      d="M12.78 16.5c-4.7 0-7.38-3.23-7.5-8.6h2.36c.08 3.94 1.82 5.61 3.2 5.95V7.9h2.22v3.4c1.36-.15 2.78-1.69 3.26-3.4h2.22c-.38 2.1-1.93 3.65-3.02 4.28 1.09.51 2.84 1.85 3.48 4.32h-2.45c-.56-1.76-1.96-3.12-3.81-3.3v3.3h-.02l-.08 0z"
      fill="white"
    />
  </svg>
);

/**
 * Official MAX Messenger logo (Vibrant violet-indigo squircle with white modern bold typography)
 */
export const MaxLogo: React.FC<MessengerLogoProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="24" height="24" rx="6" fill="#6366F1" />
    <g fill="white">
      {/* M */}
      <path d="M3.2 16.5V7.5h1.6l1.6 4.3 1.6-4.3h1.6v9H8.1v-5.6l-1.4 3.9H5.7l-1.4-3.9v5.6H3.2z" />
      {/* A */}
      <path d="M11.8 7.5h1.7l2.2 9h-1.5l-.5-2.1h-1.8l-.5 2.1h-1.4l2.3-9zm.8 5.6h1.2l-.6-2.7-.6 2.7z" />
      {/* X */}
      <path d="M16.6 7.5h1.6l1.3 2.9 1.3-2.9h1.6l-2.1 4.5 2.2 4.5h-1.6l-1.4-3-1.4 3h-1.6l2.2-4.5-2.1-4.5z" />
    </g>
  </svg>
);

/**
 * Official WhatsApp logo (Vibrant green squircle with white phone handset)
 */
export const WhatsAppLogo: React.FC<MessengerLogoProps> = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect width="24" height="24" rx="5.5" fill="#25D366" />
    <path
      d="M17.5 14.4c-.3-.15-1.7-.85-1.95-.95-.25-.1-.45-.15-.65.15-.2.3-.75.95-.9 1.15-.15.2-.35.2-.65.05-.3-.15-1.25-.45-2.4-1.45-.9-.8-1.5-1.75-1.7-2.05-.2-.3 0-.45.15-.6.15-.15.3-.35.45-.55.15-.2.2-.35.3-.55.1-.2 0-.4-.05-.55-.05-.15-.65-1.55-.9-2.15-.25-.55-.5-.5-.65-.5h-.55c-.2 0-.55.05-.85.35-.3.3-1.15 1.1-1.15 2.7 0 1.6 1.15 3.15 1.3 3.35.15.2 2.3 3.5 5.55 4.9.75.35 1.35.55 1.8.7.75.25 1.45.2 2 .1.6-.1 1.85-.75 2.1-1.5.25-.7.25-1.35.15-1.5-.1-.15-.25-.2-.55-.35z"
      fill="white"
    />
  </svg>
);
