import Header from "../src/components/Header";
import Config from "../src/components/Config";
import Footer from "../src/components/Footer";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="max-w-6xl w-full px-8 mx-auto flex-1 flex flex-col justify-between">
        <Header />
        <Link
          href="https://github.com/facebookresearch/sam2"
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto w-fit p-0"
        >
          <Image
            src="/utk_sam2logo.png"
            className="mx-auto h-auto w-auto max-w-full max-h-[150px] lg:max-h-[300px] will-change-[filter] transition-[filter] duration-300 hover:drop-shadow-[0_0_1em_rgba(255,130,0,1)]"
            alt="SAM2 Logo"
            width={400}
            height={200}
            priority
          />
        </Link>
        <Config />
        <Footer />
      </div>
    </div>
  );
}
