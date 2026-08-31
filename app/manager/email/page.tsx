// ============================================
// MANAGER EMAIL INBOX PAGE
// /manager/email
// ============================================

import { InboxLayout } from "@/components/email/inbox";

export const metadata = {
    title: "Email | Prospecto",
    description: "Gérez vos emails et conversations",
};

export default function ManagerEmailPage() {
    return <InboxLayout showTeamInbox={true} />;
}
