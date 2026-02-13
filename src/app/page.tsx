"use client";

import { useEffect, useRef, useState } from "react";
import Image from 'next/image'

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
}

interface IWindow extends Window {
  SpeechRecognition?: new () => ISpeechRecognition;
  webkitSpeechRecognition?: new () => ISpeechRecognition;
}

type Product = {
  name: string;
  price: number;
  sku: string;
  category: string;
  warranty_months?: number;
  stock?: number;
  tags?: string[];
};

type ApiResult = {
  transcript?: string;
  answer?: string;
  matches?: Product[];
  error?: string;
};

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("กำลังตรวจสอบเบราว์เซอร์...");
  const [result, setResult] = useState<ApiResult>({});

  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    const _window = window as unknown as IWindow;
    
    const SpeechRecognitionConstructor =
      _window.SpeechRecognition || _window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setStatus("เบราว์เซอร์นี้ไม่รองรับ Web Speech API (แนะนำ Chrome เท่านั้น)");
      return;
    }

    setStatus("พร้อมพูด");

    const rec = new SpeechRecognitionConstructor();
    rec.lang = "th-TH";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      setStatus("กำลังฟัง... พูดคำถามได้เลย");
    };

    rec.onend = () => {
      setIsListening(false);
      setStatus("หยุดฟังแล้ว");
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      setStatus(`เกิดข้อผิดพลาด: ${e.error || "unknown"}`);
      setResult({ error: e.error || "speech error" });
    };

    rec.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setStatus("ได้ข้อความแล้ว กำลังส่งไปถามระบบ...");
      setResult({ transcript });

      try {
        const resp = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: transcript }),
        });

        if (!resp.ok) {
          throw new Error("Network response was not ok");
        }

        const data: ApiResult = await resp.json();
        setResult(data);
        setStatus(data.error ? "เกิดข้อผิดพลาด" : "เสร็จสิ้น");
      } catch (err) {
        setStatus("เกิดข้อผิดพลาดในการเชื่อมต่อ Server");
        setResult({ error: String(err) });
      }
    };

    recognitionRef.current = rec;
    
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
  }, []);

  function start() {
    setResult({});
    try {
      recognitionRef.current?.start();
    } catch {
      console.warn("Speech recognition already started");
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return (
    <div className="h-100vh w-full bg-[#B4D1FD]">
      <main className="min-h-screen p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-[#DF5E10] font-[Mochiy_Pop_P_One]">EV Car Shop Voice Q&A (Web Speech)</h1>
        <p className="text-sm opacity-80 mt-2 text-black font-[Prompt]">
          กดเริ่มแล้วพูด เช่น “รุ่นรถยี่ห้อBYD มีอะไรบ้าง”
        </p>

        <div className="mt-6 flex gap-3 font-[Prompt]">
          {!isListening ? (
            <button className="px-4 py-2 rounded bg-[#DF5E10] text-white" onClick={start}>
              เริ่มพูด
            </button>
          ) : (
            <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={stop}>
              หยุด
            </button>
          )}
          <div className="px-3 py-2 rounded text-[#757575] text-sm bg-[#D9D9D9]">{status}</div>
        </div>

        <section className="mt-8 space-y-4 font-[Prompt]">
          <div className="p-4 rounded bg-[#07234D]">
            <div className="font-semibold">ข้อความที่ถอดเสียง</div>
            <div className="mt-2 text-sm bg-white rounded p-2 text-black">{result.transcript ?? "-"}</div>
          </div>

          <div className="p-4 rounded bg-[#07234D]">
            <div className="font-semibold">คำตอบ</div>
            <div className="mt-2 text-sm whitespace-pre-wrap text-black p-2 bg-white rounded">{result.answer ?? "-"}</div>
            {result.error && <div className="mt-2 text-sm text-red-600">{result.error}</div>}
          </div>
        </section>

        <div className="mt-6 font-[Prompt]">
          <h2 className="font-bold mb-4 text-black">สินค้าแนะนำ:</h2>
          
          {result.matches && result.matches.length > 0 ? (
            <div className="grid grid-cols-3 gap-4 w-full">
              {result.matches.map((product, index) => (
                <div
                  key={product.sku || index}
                  className="flex flex-col items-center min-w-60 px-1 pb-4 border rounded-lg shadow-sm hover:shadow-md transition bg-white"
                >
                  <div className="relative w-45 h-45">
                    <Image
                      src={`/images/${product.category}/${product.sku}.png`}
                      alt={product.name}
                      fill
                      className="object-contain"
                      onError={() => {
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between w-full">
                    <h3 className="mt-3 font-semibold text-center text-xs text-black font-[Mochiy_Pop_P_One]">{product.name}</h3>
                    <p className="text-blue-600 font-bold mt-3">
                      {product.price.toLocaleString()} บาท
                    </p>
                  </div>
                  <div className="flex w-full flex-col items-start px-4 mt-3  text-center text-xs text-black font-[Mochiy_Pop_P_One]">Warranty
                    {product.warranty_months && (
                      <li className="text-s text-black ml-5 font-normal font-[Prompt] mt-2">ประกัน {product.warranty_months} เดือน</li>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 italic">
              {result.transcript ? "ไม่พบสินค้าหรือยังไม่ได้ค้นหา" : "รอคำสั่งเสียง..."}
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}