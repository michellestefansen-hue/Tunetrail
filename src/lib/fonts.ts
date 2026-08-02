import { Archivo_Black, Schibsted_Grotesk } from "next/font/google";

/**
 * Shared so the localised tree and the sign-in/moderation pages load one copy
 * of each font rather than one per layout.
 */
export const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

export const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-schibsted-grotesk",
  subsets: ["latin"],
});

export const fontVariables = `${archivoBlack.variable} ${schibstedGrotesk.variable}`;
