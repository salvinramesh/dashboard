import React from 'react';
import {
    Settings as SettingsIcon, Plus, Edit2, Trash2, Save, X, LogOut, Bell, BellOff, Search, ChevronDown, Check,
    // Infrastructure & Hardware
    Server, Database, HardDrive, Cpu, MemoryStick, Laptop, Tablet, Smartphone, Monitor, Watch, Tv, Printer, Router, Webcam, Keyboard, Mouse,
    // Network & Cloud
    Network, Wifi, Signal, Globe, Cloud, CloudLightning, CloudOff, Radio, Satellite, Antenna, Cast,
    // Development & Ops
    Terminal, Code, GitBranch, GitCommit, GitMerge, GitPullRequest, Bug, Box, Package, Layers, Layout, Command, Hash, FileCode, FileJson, FileTerminal,
    // Security
    Shield, Lock, Unlock, Key, Fingerprint, Eye, EyeOff,
    // Brands & Tools
    Github, Gitlab, Slack, Chrome, Trello, Figma, Codepen, Dribbble, Linkedin, Twitter, Youtube, Twitch,
    // Misc
    Activity, Zap, Anchor, Power, Plug, Battery, BatteryCharging
} from 'lucide-react';

const UbuntuIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" className={className}>
        <path d="M128 0C57.309 0 0 57.309 0 128s57.309 128 128 128 128-57.309 128-128S198.691 0 128 0zm0 40c48.523 0 88 39.477 88 88s-39.477 88-88 88-88-39.477-88-88 39.477-88 88-88zm0 50c-20.94 0-38 17.06-38 38s17.06 38 38 38 38-17.06 38-38-17.06-38-38-38z" />
    </svg>
);

const DebianIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" className={className}>
        <path d="M128 0C57.309 0 0 57.309 0 128s57.309 128 128 128 128-57.309 128-128S198.691 0 128 0zm0 40c48.523 0 88 39.477 88 88s-39.477 88-88 88-88-39.477-88-88 39.477-88 88-88zm0 50c-20.94 0-38 17.06-38 38s17.06 38 38 38 38-17.06 38-38-17.06-38-38-38z" />
    </svg>
);

const RedHatIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" className={className}>
        <path d="M128 0c-17.6 0-32 14.4-32 32v32H48c-8.8 0-16 7.2-16 16v16h192V80c0-8.8-7.2-16-16-16h-48V32c0-17.6-14.4-32-32-32zm0 48c-8.8 0-16 7.2-16 16v16h32V64c0-8.8-7.2-16-16-16z" />
    </svg>
);

const CentOSIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor" className={className}>
        <path d="M100 0 L0 100 L100 100 L0 0 Z" />
    </svg>
);

const WindowsIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor" className={className}>
        <path d="M0 0 H45 V45 H0 Z M55 0 H100 V45 H55 Z M0 55 H45 V100 H0 Z M55 55 H100 V100 H55 Z" />
    </svg>
);

const AppleIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18c-1.066 1.156-.902 2.482-.878 2.516s1.52.087 2.475-1.258.762-2.391.728-2.43m3.314 11.733c-.048-.096-2.325-1.234-2.113-3.422s1.675-2.789 1.698-2.854-.597-.79-1.254-1.157a3.7 3.7 0 0 0-1.563-.434c-.108-.003-.483-.095-1.254.116-.508.139-1.653.589-1.968.607-.316.018-1.256-.522-2.267-.665-.647-.125-1.333.131-1.824.328-.49.196-1.422.754-2.074 2.237-.652 1.482-.311 3.83-.067 4.56s.625 1.924 1.273 2.796c.576.984 1.34 1.667 1.659 1.899s1.219.386 1.843.067c.502-.308 1.408-.485 1.766-.472.357.013 1.061.154 1.782.539.571.197 1.111.115 1.652-.105.541-.221 1.324-1.059 2.238-2.758q.52-1.185.473-1.282" />
    </svg>
);

const SapIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
        <text x="50%" y="50%" dy=".35em" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">SAP</text>
    </svg>
);

export const iconMap = {
    // Infrastructure
    'Server': <Server size={24} />,
    'Database': <Database size={24} />,
    'HardDrive': <HardDrive size={24} />,
    'Cpu': <Cpu size={24} />,
    'Memory': <MemoryStick size={24} />,
    'Laptop': <Laptop size={24} />,
    'Tablet': <Tablet size={24} />,
    'Mobile': <Smartphone size={24} />,
    'Monitor': <Monitor size={24} />,
    'Router': <Router size={24} />,
    'Printer': <Printer size={24} />,

    // Network & Cloud
    'Cloud': <Cloud size={24} />,
    'Network': <Network size={24} />,
    'Wifi': <Wifi size={24} />,
    'Globe': <Globe size={24} />,
    'Signal': <Signal size={24} />,
    'Satellite': <Satellite size={24} />,
    'Radio': <Radio size={24} />,

    // Development
    'Terminal': <Terminal size={24} />,
    'Code': <Code size={24} />,
    'Git': <GitBranch size={24} />,
    'Bug': <Bug size={24} />,
    'Box': <Box size={24} />,
    'Package': <Package size={24} />,
    'Layers': <Layers size={24} />,
    'Command': <Command size={24} />,

    // Security
    'Shield': <Shield size={24} />,
    'Lock': <Lock size={24} />,
    'Key': <Key size={24} />,
    'Fingerprint': <Fingerprint size={24} />,

    // Brands
    'Github': <Github size={24} />,
    'Gitlab': <Gitlab size={24} />,
    'Slack': <Slack size={24} />,
    'Chrome': <Chrome size={24} />,

    // OS (Custom)
    'Ubuntu': <UbuntuIcon size={24} />,
    'Debian': <DebianIcon size={24} />,
    'RedHat': <RedHatIcon size={24} />,
    'CentOS': <CentOSIcon size={24} />,
    'Windows': <WindowsIcon size={24} />,
    'Apple': <AppleIcon size={24} />,
    'SAP': <SapIcon size={24} />,

    // Misc
    'Activity': <Activity size={24} />,
    'Zap': <Zap size={24} />,
    'Power': <Power size={24} />,
    'Anchor': <Anchor size={24} />
};

export const getIcon = (iconName) => {
    return iconMap[iconName] || <span className="text-2xl">{iconName}</span>;
};
