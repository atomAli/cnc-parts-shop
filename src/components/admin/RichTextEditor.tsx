"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  RemoveFormatting,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

/**
 * ویرایشگر غنی سبک بر پایهٔ contentEditable — بدون کتابخانهٔ اضافی.
 * execCommand در Chrome 109 و Firefox 115 پشتیبانی میشود.
 */
export default function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    // جلوگیری از پرش مکان نما موقع تایپ
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  const exec = (command: string, argument?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, argument);
    onChange(el.innerHTML);
  };

  const addLink = () => {
    const url = window.prompt("آدرس لینک:", "https://");
    if (url) exec("createLink", url);
  };

  const addImage = () => {
    const url = window.prompt("آدرس تصویر:", "https://");
    if (url) exec("insertImage", url);
  };

  const buttonClass =
    "grid h-8 w-8 place-items-center rounded-lg text-stone-600 hover:bg-gray-100 hover:text-blue-700";

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 p-2">
        <button type="button" title="پررنگ" onClick={() => exec("bold")} className={buttonClass}>
          <Bold size={16} />
        </button>
        <button type="button" title="مورب" onClick={() => exec("italic")} className={buttonClass}>
          <Italic size={16} />
        </button>
        <button type="button" title="زیرخط" onClick={() => exec("underline")} className={buttonClass}>
          <Underline size={16} />
        </button>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <button
          type="button"
          title="عنوان ۲"
          onClick={() => exec("formatBlock", "h2")}
          className={buttonClass}
        >
          <Heading2 size={16} />
        </button>
        <button
          type="button"
          title="عنوان ۳"
          onClick={() => exec("formatBlock", "h3")}
          className={buttonClass}
        >
          <Heading3 size={16} />
        </button>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <button
          type="button"
          title="فهرست نقطهای"
          onClick={() => exec("insertUnorderedList")}
          className={buttonClass}
        >
          <List size={16} />
        </button>
        <button
          type="button"
          title="فهرست شمارهدار"
          onClick={() => exec("insertOrderedList")}
          className={buttonClass}
        >
          <ListOrdered size={16} />
        </button>
        <span className="mx-1 h-5 w-px bg-gray-200" />
        <button type="button" title="لینک" onClick={addLink} className={buttonClass}>
          <Link2 size={16} />
        </button>
        <button type="button" title="تصویر" onClick={addImage} className={buttonClass}>
          <ImageIcon size={16} />
        </button>
        <button
          type="button"
          title="پاک کردن قالب"
          onClick={() => exec("removeFormat")}
          className={buttonClass}
        >
          <RemoveFormatting size={16} />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir="rtl"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="min-h-[320px] p-4 text-sm leading-7 text-stone-800 outline-none"
        data-placeholder="متن مقاله را بنویسید…"
      />
    </div>
  );
}
