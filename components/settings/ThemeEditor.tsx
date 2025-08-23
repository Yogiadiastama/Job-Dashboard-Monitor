import React from 'react';
import { useCustomization, defaultColors } from '../../hooks/useCustomization';
import { CustomColors } from '../../types';

interface ColorPickerProps {
    label: string;
    colorKey: keyof CustomColors;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, colorKey }) => {
    const { colors, updateColor } = useCustomization();
    const darkColorKey = `--dark-${String(colorKey).substring(2)}`;
    
    const lightValue = colors[colorKey] || defaultColors[colorKey];
    const darkValue = colors[darkColorKey] || defaultColors[darkColorKey];

    return (
        <div className="p-4 border dark:border-gray-700 rounded-lg">
            <label className="block text-sm font-bold mb-2">{label}</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Picker */}
                <div>
                    <p className="text-xs text-gray-500 mb-1">Light Mode</p>
                    <div className="flex items-center space-x-2">
                        <input
                            type="color"
                            value={lightValue}
                            onChange={(e) => updateColor(String(colorKey), e.target.value)}
                            className="w-10 h-10 p-1 border-none rounded-md cursor-pointer bg-transparent"
                        />
                        <span className="font-mono text-sm">{lightValue}</span>
                    </div>
                </div>
                {/* Dark Mode Picker */}
                <div>
                    <p className="text-xs text-gray-500 mb-1">Dark Mode</p>
                    <div className="flex items-center space-x-2">
                        <input
                            type="color"
                            value={darkValue}
                            onChange={(e) => updateColor(darkColorKey, e.target.value)}
                            className="w-10 h-10 p-1 border-none rounded-md cursor-pointer bg-transparent"
                        />
                        <span className="font-mono text-sm">{darkValue}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ThemeEditor: React.FC = () => {
    const { resetColors } = useCustomization();

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset all colors to their default values? This action cannot be undone.")) {
            resetColors();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Theme & Color Editor</h3>
                <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                    Reset to Default
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ColorPicker label="App Background" colorKey="--app-bg" />
                <ColorPicker label="Sidebar Background" colorKey="--sidebar-bg" />
                <ColorPicker label="Header Background" colorKey="--header-bg" />
                <ColorPicker label="Card/Panel Background" colorKey="--card-bg" />
                <ColorPicker label="Primary Text" colorKey="--text-primary" />
                <ColorPicker label="Secondary Text" colorKey="--text-secondary" />
            </div>
        </div>
    );
};

export default ThemeEditor;