"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, ActionPerformed, Token } from "@capacitor/push-notifications";
import { App } from "@capacitor/app";

export function MobilePushHandler() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        if (status !== "authenticated" || !session?.user?.id) return;
        if (initializedRef.current) return;
        initializedRef.current = true;

        const platform = Capacitor.getPlatform();

        const setupPush = async () => {
            try {
                // Request push permissions from user
                let permStatus = await PushNotifications.checkPermissions();
                if (permStatus.receive === "prompt") {
                    permStatus = await PushNotifications.requestPermissions();
                }

                if (permStatus.receive !== "granted") {
                    console.log("Push notification permission not granted:", permStatus.receive);
                    return;
                }

                // Register with Apple APNs / Google FCM
                await PushNotifications.register();

                // Listen for successful token registration
                await PushNotifications.addListener("registration", async (token: Token) => {
                    try {
                        await fetch("/api/notifications/device-token", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                token: token.value,
                                platform,
                            }),
                        });
                    } catch (err) {
                        console.error("Failed to register device token on backend:", err);
                    }
                });

                // Listen for notification tapped by user
                await PushNotifications.addListener(
                    "pushNotificationActionPerformed",
                    (notification: ActionPerformed) => {
                        const data = notification.notification.data;
                        if (data?.link && typeof data.link === "string") {
                            router.push(data.link);
                        } else if (session?.user?.role === "CLIENT") {
                            router.push("/client/portal/meetings");
                        } else if (session?.user?.role === "MANAGER") {
                            router.push("/manager/dashboard");
                        }
                    }
                );
            } catch (err) {
                console.error("Push notification setup error:", err);
            }
        };

        // Handle Android hardware back button
        const setupBackButton = async () => {
            if (platform === "android") {
                await App.addListener("backButton", ({ canGoBack }) => {
                    if (canGoBack) {
                        window.history.back();
                    } else {
                        App.exitApp();
                    }
                });
            }
        };

        void setupPush();
        void setupBackButton();

        return () => {
            if (Capacitor.isNativePlatform()) {
                PushNotifications.removeAllListeners().catch(() => {});
                App.removeAllListeners().catch(() => {});
            }
        };
    }, [status, session, router]);

    return null;
}

export default MobilePushHandler;
