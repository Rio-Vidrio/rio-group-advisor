"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-rio-dark text-white sticky top-0 z-50 shadow-lg border-b-2 border-rio-red">
      {/* Desktop: single row with logo | title | az mark */}
      <div className="hidden sm:flex max-w-7xl mx-auto px-4 py-3 items-center justify-between">
        {/* Logo Left */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Image
            src="/rio-square.png"
            alt="The Rio Group"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div>
            <div className="font-bold text-lg leading-tight">The Rio Group</div>
            <div className="text-xs text-gray-400">Products Advisor</div>
          </div>
        </div>

        {/* Center Title */}
        <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
          <span className="text-white font-medium text-sm tracking-wide">
            Rio Group&nbsp;|&nbsp;Home Buying Advisor
          </span>
        </div>

        {/* AZ Mark Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Powered by</div>
            <div className="text-sm font-semibold text-gray-300">AZ &amp; Associates</div>
          </div>
          <Image
            src="/az-logo-white.png"
            alt="AZ & Associates"
            width={36}
            height={36}
            className="rounded"
          />
        </div>
      </div>

      {/* Mobile: logo row + title below */}
      <div className="sm:hidden max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* Logo Left */}
          <div className="flex items-center gap-2">
            <Image
              src="/rio-square.png"
              alt="The Rio Group"
              width={32}
              height={32}
              className="rounded-lg"
            />
          </div>
          {/* AZ Mark Right */}
          <div className="flex items-center gap-2">
            <Image
              src="/az-logo-white.png"
              alt="AZ & Associates"
              width={30}
              height={30}
              className="rounded"
            />
          </div>
        </div>
        {/* Title row below logos */}
        <div className="text-center pb-2">
          <span className="text-white font-medium text-xs tracking-wide">
            Rio Group&nbsp;|&nbsp;Home Buying Advisor
          </span>
        </div>
      </div>
    </header>
  );
}
