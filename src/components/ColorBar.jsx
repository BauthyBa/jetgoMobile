export default function ColorBar({ className = "" }) {
  return (
    <div className={"w-full h-1 md:h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 shadow-[0_0_20px_rgba(59,130,246,0.35)] "+className} />
  )
}

