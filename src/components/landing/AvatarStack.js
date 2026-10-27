import Image from "next/image";

const AVATARS = [
  "/images/avatar-1.jpg",
  "/images/avatar-2.jpg",
  "/images/avatar-3.jpg",
  "/images/avatar-4.jpg",
];

export default function AvatarStack() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {AVATARS.map((src) => (
          <span
            key={src}
            className="relative size-10 overflow-hidden rounded-full ring-2 ring-black"
          >
            <Image src={src} alt="" fill sizes="40px" className="object-cover" />
          </span>
        ))}
      </div>
      <span className="whitespace-nowrap text-xs text-white/75">10K+ patients cared for</span>
    </div>
  );
}
