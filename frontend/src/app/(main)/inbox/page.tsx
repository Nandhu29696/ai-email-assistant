import EmailList from "@/components/Email/EmailList";

export default function InboxPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Inbox</h1>
      <EmailList />
    </div>
  );
}
