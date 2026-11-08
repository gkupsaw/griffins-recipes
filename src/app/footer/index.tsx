"use client";

import Image from "next/image";
import { FaGithub } from "react-icons/fa";
import logo from "../assets/logo.png";
import { redirect } from "next/navigation";

interface FooterProps {
  hasHome?: boolean;
}

export default function Footer(props: FooterProps) {
  return (
    <footer className="flex flex-row justify-items-center flex-wrap row-start-3 my-8">
      {props.hasHome && (
        <a
          className="flex flex-1 hover:underline hover:underline-offset-4 text-center justify-center items-center"
          onClick={() =>
            redirect(window.location.href.split("/").slice(0, -1).join("/"))
          }
          style={{ width: "6em", cursor: "pointer" }}
        >
          Home
        </a>
      )}
      <a
        className="flex flex-1 hover:underline hover:underline-offset-4 text-center justify-center items-center"
        href="https://github.com/gkupsaw/griffins-recipes"
        target="_blank"
        rel="noopener noreferrer"
        style={{ width: "6em", cursor: "pointer" }}
      >
        <FaGithub size={32} />
      </a>
      <a
        className="flex flex-1 hover:underline hover:underline-offset-4 text-center justify-center items-center"
        href="https://www.griffinkupsaw.com/"
        target="_blank"
        rel="noopener noreferrer"
        style={{ width: "6em", cursor: "pointer" }}
      >
        <Image src={logo} alt="Logo" width={44} height={44} />
      </a>
    </footer>
  );
}
