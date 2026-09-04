"use client";

import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export function useNativeDevice() {
    const [isNative, setIsNative] = useState(false);
    const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");
    const [isMobileScreen, setIsMobileScreen] = useState(false);

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
        setPlatform(Capacitor.getPlatform() as "ios" | "android" | "web");

        const checkMobile = () => {
            setIsMobileScreen(window.innerWidth < 1024); // lg breakpoint in Tailwind
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Light) => {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.impact({ style });
            } catch {
                // Ignore if not supported
            }
        }
    };

    return {
        isNative,
        platform,
        isMobileScreen,
        isMobileExperience: isNative || isMobileScreen,
        triggerHaptic,
    };
}
