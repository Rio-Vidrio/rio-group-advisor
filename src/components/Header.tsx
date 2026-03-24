"use client";

import Image from "next/image";

export default function Header() {
  return (
    <header className="bg-rio-dark text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo Left */}
        <div className="flex items-center gap-3">
          <Image
            src="/rio-square.png"
            alt="The Rio Group"
            width={40}
            height={40}
            className="rounded-lg hidden sm:block"
          />
          <Image
            src="/rio-square.png"
            alt="The Rio Group"
            width={32}
            height={32}
            className="rounded-lg sm:hidden"
          />
          <div className="hidden sm:block">
            <div className="font-bold text-lg leading-tight">The Rio Group</div>
            <div className="text-xs text-gray-400">Products Advisor</div>
          </div>
        </div>

        {/* AZ Mark Right */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
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
    </header>
  );
}
