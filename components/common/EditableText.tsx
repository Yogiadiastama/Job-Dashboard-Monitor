import React, { useState, useEffect, useRef } from 'react';
import { useCustomization } from '../../hooks/useCustomization';

interface EditableTextProps {
    contentKey: string;
    defaultText: string;
    as?: keyof JSX.IntrinsicElements;
    className?: string;
    isTextarea?: boolean;
    style?: React.CSSProperties;
}

const EditableText: React.FC<EditableTextProps> = ({ contentKey, defaultText, as = 'p', className = '', isTextarea = false, style }) => {
    const { isEditMode, getText, updateText } = useCustomization();
    const [isEditing, setIsEditing] = useState(false);
    const text = getText(contentKey, defaultText);
    const [currentText, setCurrentText] = useState(text);
    const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

    useEffect(() => {
        setCurrentText(text);
    }, [text]);
    
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);
    
    const handleSave = async () => {
        setIsEditing(false);
        if (currentText.trim() !== text) {
            await updateText(contentKey, currentText.trim());
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isTextarea) {
            handleSave();
        } else if (e.key === 'Escape') {
            setCurrentText(text);
            setIsEditing(false);
        }
    };
    
    const editModeClasses = isEditMode ? 'border-2 border-dashed border-transparent hover:border-blue-500 cursor-pointer p-1 -m-1 rounded-md transition-all' : '';

    if (isEditMode && isEditing) {
        const InputComponent = isTextarea ? 'textarea' : 'input';
        const inputClasses = `${className} w-full bg-white dark:bg-gray-900 border-2 border-blue-600 rounded-md p-1 -m-1 focus:outline-none`;
        return (
            <InputComponent
                ref={inputRef}
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className={inputClasses}
                rows={isTextarea ? 3 : undefined}
                style={style}
            />
        );
    }
    
    return React.createElement(
        as,
        {
            className: `${className} ${editModeClasses}`,
            onClick: () => isEditMode && setIsEditing(true),
            style: style,
        },
        text
    );
};

export default EditableText;