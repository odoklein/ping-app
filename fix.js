const fs = require('fs');
let code = fs.readFileSync('components/email/inbox/MailboxManagerDialog.tsx', 'utf8');

const startIndex = code.indexOf('{isLoading ? (');
const endIndex = code.indexOf(') : mailboxes.length === 0 ? (');

const brokenSnippet = code.slice(startIndex, endIndex);

const corrected = `{isLoading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden">
                                            <div className="h-1.5 w-full skeleton-shimmer" />
                                            <div className="p-4 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
                                                    <div className="space-y-2 flex-1">
                                                        <div className="h-4 w-32 skeleton-shimmer rounded" />
                                                        <div className="h-3 w-48 skeleton-shimmer rounded" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[1, 2, 3].map(j => (
                                                        <div key={j} className="h-14 skeleton-shimmer rounded-lg" />
                                                    ))}
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="h-9 flex-1 skeleton-shimmer rounded-xl" />
                                                    <div className="h-9 flex-1 skeleton-shimmer rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            `;

code = code.replace(brokenSnippet, corrected);
fs.writeFileSync('components/email/inbox/MailboxManagerDialog.tsx', code);
console.log('Fixed MailboxManagerDialog.tsx');
