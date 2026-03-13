'use client';

import {useEffect, useRef, useState} from 'react'
import {cn, configureAssistant, getSubjectColor} from "@/lib/utils";
import {vapi} from "@/lib/vapi.sdk";
import Image from "next/image";
import Lottie, {LottieRefCurrentProps} from "lottie-react";
import soundwaves from '@/constants/soundwaves.json'
import {addToSessionHistory} from "@/lib/actions/companion.actions";

enum CallStatus {
    INACTIVE = 'INACTIVE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    FINISHED = 'FINISHED',
}

const CompanionComponent = ({ companionId, subject, topic, name, userName, userImage, style, voice }: CompanionComponentProps) => {
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [messages, setMessages] = useState<SavedMessage[]>([]);
    const [textMessage, setTextMessage] = useState('');
    const [isCaptionsOn, setIsCaptionsOn] = useState(false);

    const lottieRef = useRef<LottieRefCurrentProps>(null);
    const captionsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(lottieRef) {
            if(isSpeaking) {
                lottieRef.current?.play()
            } else {
                lottieRef.current?.stop()
            }
        }
    }, [isSpeaking, lottieRef])

    // Auto-scroll captions overlay to latest message
    useEffect(() => {
        if (isCaptionsOn && captionsEndRef.current) {
            captionsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isCaptionsOn]);

    useEffect(() => {
        const onCallStart = () => setCallStatus(CallStatus.ACTIVE);

        const onCallEnd = () => {
            setCallStatus(CallStatus.FINISHED);
            addToSessionHistory(companionId)
        }

        const onMessage = (message: Message) => {
            if(message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage= { role: message.role, content: message.transcript}
                setMessages((prev) => [newMessage, ...prev])
            }
        }

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);

        const onError = (error: Error) => console.log('Error', error);

        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('message', onMessage);
        vapi.on('error', onError);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);

        return () => {
            vapi.off('call-start', onCallStart);
            vapi.off('call-end', onCallEnd);
            vapi.off('message', onMessage);
            vapi.off('error', onError);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
        }
    }, []);

    const toggleMicrophone = () => {
        const isMuted = vapi.isMuted();
        vapi.setMuted(!isMuted);
        setIsMuted(!isMuted)
    }

    const handleCall = async () => {
        setCallStatus(CallStatus.CONNECTING)

        const assistantOverrides = {
            variableValues: { subject, topic, style },
            clientMessages: ["transcript"],
            serverMessages: [],
        }

        // @ts-expect-error
        vapi.start(configureAssistant(voice, style), assistantOverrides)
    }

    const handleDisconnect = () => {
        setCallStatus(CallStatus.FINISHED)
        vapi.stop()
    }

    const handleSendText = (e: React.FormEvent) => {
        e.preventDefault();
        if (!textMessage.trim() || callStatus !== CallStatus.ACTIVE) return;

        // Send text message to Vapi as a user message
        vapi.send({
            type: 'add-message',
            message: {
                role: 'user',
                content: textMessage.trim(),
            },
        });

        // Add to local transcript
        const newMessage: SavedMessage = { role: 'user', content: textMessage.trim() };
        setMessages((prev) => [newMessage, ...prev]);

        setTextMessage('');
    }

    const toggleCaptions = () => {
        setIsCaptionsOn((prev) => !prev);
    }

    return (
        <section className="flex flex-col h-[70vh]">
            <section className="flex gap-8 max-sm:flex-col">
                <div className="companion-section">
                    <div className="companion-avatar" style={{ backgroundColor: getSubjectColor(subject)}}>
                        <div
                            className={
                            cn(
                                'absolute transition-opacity duration-1000', callStatus === CallStatus.FINISHED || callStatus === CallStatus.INACTIVE ? 'opacity-1001' : 'opacity-0', callStatus === CallStatus.CONNECTING && 'opacity-100 animate-pulse'
                            )
                        }>
                            <Image src={`/icons/${subject}.svg`} alt={subject} width={150} height={150} className="max-sm:w-fit" />
                        </div>

                        <div className={cn('absolute transition-opacity duration-1000', callStatus === CallStatus.ACTIVE ? 'opacity-100': 'opacity-0')}>
                            <Lottie
                                lottieRef={lottieRef}
                                animationData={soundwaves}
                                autoplay={false}
                                className="companion-lottie"
                            />
                        </div>
                    </div>
                    <p className="font-bold text-2xl">{name}</p>

                    {/* Live Captions Overlay */}
                    {isCaptionsOn && callStatus === CallStatus.ACTIVE && (
                        <div className="captions-overlay">
                            <div className="captions-overlay-header">
                                <Image src="/icons/captions.svg" alt="captions" width={16} height={16} className="invert" />
                                <span>Live Captions</span>
                            </div>
                            <div className="captions-overlay-messages no-scrollbar">
                                {[...messages].reverse().map((message, index) => (
                                    <p
                                        key={index}
                                        className={cn(
                                            'captions-overlay-message',
                                            message.role === 'user' ? 'text-orange-300' : 'text-white'
                                        )}
                                    >
                                        <span className="font-bold">
                                            {message.role === 'user' ? userName : name.split(' ')[0].replace(/[.,]/g, '')}:
                                        </span>{' '}
                                        {message.content}
                                    </p>
                                ))}
                                <div ref={captionsEndRef} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="user-section">
                    <div className="user-avatar">
                        <Image src={userImage} alt={userName} width={130} height={130} className="rounded-lg" />
                        <p className="font-bold text-2xl">
                            {userName}
                        </p>
                    </div>
                    <button className="btn-mic" onClick={toggleMicrophone} disabled={callStatus !== CallStatus.ACTIVE}>
                        <Image src={isMuted ? '/icons/mic-off.svg' : '/icons/mic-on.svg'} alt="mic" width={36} height={36} />
                        <p className="max-sm:hidden">
                            {isMuted ? 'Turn on microphone' : 'Turn off microphone'}
                        </p>
                    </button>
                    <button
                        className={cn(
                            'btn-captions',
                            isCaptionsOn && 'btn-captions-active'
                        )}
                        onClick={toggleCaptions}
                        disabled={callStatus !== CallStatus.ACTIVE}
                    >
                        <Image src="/icons/captions.svg" alt="captions" width={36} height={36} className={isCaptionsOn ? '' : 'opacity-50'} />
                        <p className="max-sm:hidden">
                            {isCaptionsOn ? 'Turn off captions' : 'Turn on captions'}
                        </p>
                    </button>
                    <button className={cn('rounded-lg py-2 cursor-pointer transition-colors w-full text-white', callStatus ===CallStatus.ACTIVE ? 'bg-red-700' : 'bg-primary', callStatus === CallStatus.CONNECTING && 'animate-pulse')} onClick={callStatus === CallStatus.ACTIVE ? handleDisconnect : handleCall}>
                        {callStatus === CallStatus.ACTIVE
                        ? "End Session"
                        : callStatus === CallStatus.CONNECTING
                            ? 'Connecting'
                        : 'Start Session'
                        }
                    </button>
                </div>
            </section>

            {/* Text Input Section */}
            <form className="text-input-form" onSubmit={handleSendText}>
                <input
                    type="text"
                    className="text-input"
                    style={{ color: '#000' }}
                    placeholder={callStatus === CallStatus.ACTIVE ? "Type a message to your companion..." : "Start a session to send messages..."}
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    disabled={callStatus !== CallStatus.ACTIVE}
                />
                <button
                    type="submit"
                    className="btn-send"
                    disabled={callStatus !== CallStatus.ACTIVE || !textMessage.trim()}
                >
                    <Image src="/icons/send.svg" alt="send" width={24} height={24} />
                </button>
            </form>

            <section className="transcript">
                <div className="transcript-message no-scrollbar">
                    {messages.map((message, index) => {
                        if(message.role === 'assistant') {
                            return (
                                <p key={index} className="max-sm:text-sm">
                                    {
                                        name
                                            .split(' ')[0]
                                            .replace('/[.,]/g, ','')
                                    }: {message.content}
                                </p>
                            )
                        } else {
                           return <p key={index} className="text-primary max-sm:text-sm">
                                {userName}: {message.content}
                            </p>
                        }
                    })}
                </div>

                <div className="transcript-fade" />
            </section>
        </section>
    )
}

export default CompanionComponent
