import { Loader2 } from 'lucide-react'

export default function Loader({ text = 'LOADING WLM...' }: { text?: string }) {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="relative">
                {/* Outer Glow */}
                <div className="absolute inset-0 bg-[#FC4C02] rounded-full blur-xl opacity-20 animate-pulse" />

                {/* Spinner */}
                <Loader2 className="w-12 h-12 text-[#FC4C02] animate-spin relative z-10" />
            </div>

            {text && (
                <p className="mt-4 text-white font-medium animate-pulse tracking-widest text-sm">
                    {text}
                </p>
            )}
        </div>
    )
}
