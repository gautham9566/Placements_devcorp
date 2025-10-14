export default function LMSPage() {
  return (
    <div className="w-full min-h-screen flex-1">
      <iframe
        src="http://localhost:4000/admin"
        className="w-full min-h-screen border-0"
        title="LMS Admin"
      />
    </div>
  );
}
