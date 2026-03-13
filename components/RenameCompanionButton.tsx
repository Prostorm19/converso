"use client";

import { renameCompanion } from "@/lib/actions/companion.actions";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const RenameCompanionButton = ({
    companionId,
    currentName,
}: {
    companionId: string;
    currentName: string;
}) => {
    const pathname = usePathname();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(currentName);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleRename = async () => {
        const trimmed = name.trim();
        if (!trimmed || trimmed === currentName) {
            setName(currentName);
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        try {
            await renameCompanion(companionId, trimmed, pathname);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to rename:", error);
            setName(currentName);
            setIsEditing(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleRename();
        } else if (e.key === "Escape") {
            setName(currentName);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleRename}
                    disabled={isLoading}
                    className="rename-input"
                    maxLength={50}
                />
            </div>
        );
    }

    return (
        <button
            className="rename-btn"
            onClick={() => setIsEditing(true)}
            title="Rename companion"
        >
            <Image
                src="/icons/edit.svg"
                alt="Rename"
                width={16}
                height={16}
            />
        </button>
    );
};

export default RenameCompanionButton;
