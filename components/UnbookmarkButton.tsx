"use client";

import { removeBookmark } from "@/lib/actions/companion.actions";
import Image from "next/image";
import { usePathname } from "next/navigation";

const UnbookmarkButton = ({ companionId }: { companionId: string }) => {
    const pathname = usePathname();

    const handleUnbookmark = async () => {
        await removeBookmark(companionId, pathname);
    };

    return (
        <button
            className="companion-bookmark"
            onClick={handleUnbookmark}
            title="Remove bookmark"
        >
            <Image
                src="/icons/bookmark-filled.svg"
                alt="Remove bookmark"
                width={12.5}
                height={15}
            />
        </button>
    );
};

export default UnbookmarkButton;
