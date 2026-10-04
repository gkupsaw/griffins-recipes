"use client";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { redirect } from "next/navigation";
import { useCallback } from "react";

export default function RecipeForm() {
  const signinRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      redirect(window.location.href.split("/").slice(0, -1).join("/"));
    }
  }, []);

  return (
    <div className="font-sans flex flex-col items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20 md:px-[20%]">
      <Authenticator hideSignUp>
        {() => (
          <form className="font-mono flex flex-col gap-[32px] row-start-2 w-full max-w-full">
            <div
              id="Title"
              className="flex flex-1 flex-col row-start-2 items-center sm:items-center md:text-5xl text-3xl w-full max-w-full"
              ref={signinRef}
            >
              <p className="text-center pb-4 wrap-break-word p-4 rounded-sm">
                Redirecting...
              </p>
            </div>
          </form>
        )}
      </Authenticator>
      <footer className="flex flex-row justify-items-center items-center">
        <p className="flex-1 text-center">
          Reach out to Griffin for sign-in information! :)
        </p>
      </footer>
    </div>
  );
}
