'use client';

import { useEffect, useState } from 'react';
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import BookingForm from "@/components/BookingForm";
import AiPrediction from "@/components/AiPrediction";
import Starfield from "@/components/Starfield";
import { Language, tr } from "@/lib/i18n";

export default function Home() {
  const [language,setLanguage]=useState<Language>("en");
  const t=tr(language);
  useEffect(()=>{const saved=window.localStorage.getItem("nakshatra-language") as Language|null;if(saved==="en"||saved==="hi"||saved==="mr")setLanguage(saved);},[]);
  const changeLanguage=(value:Language)=>{setLanguage(value);window.localStorage.setItem("nakshatra-language",value);document.documentElement.lang=value;};
  return <><Starfield/><Navbar language={language} onLanguageChange={changeLanguage}/><main><Hero language={language}/><div className="wrap"><div className="glyph-divider">☉ ☾ ☿ ♀ ♂</div></div><AiPrediction language={language}/><About language={language}/><Services language={language}/><BookingForm language={language}/></main><footer><div className="wrap">{t.footer}</div></footer></>;
}