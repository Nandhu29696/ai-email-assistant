export default function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin"
    />
  );
}
