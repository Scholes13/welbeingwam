import { Loader2 } from 'lucide-react'

export default function Loader({ text = 'LOADING WLM...' }: { text?: string }) {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0A0A0A]">
            {/* Ambient glow */}
            <div className="absolute w-48 h-48 bg-[#FC4C02] rounded-full blur-[100px] opacity-[0.08]" />

            <div className="relative">
                {/* Pulse ring */}
                <div className="absolute inset-0 -m-3 rounded-full border border-[#FC4C02]/20 animate-ping" />

                {/* Spinner */}
                <Loader2 className="w-10 h-10 text-[#FC4C02] animate-spin relative z-10" />
            </div>

            {text && (
                <p className="mt-6 text-white/40 font-medium tracking-[0.2em] text-xs uppercase">
                    {text}
                </p>
            )}
        </div>
    )
}
