# TurnRight Chat & Button Container Architecture

## 🏗️ Component Hierarchy

```
App.tsx (Router)
└── Pages/Index.tsx (Main page with header + layout)
    ├── Header (Fixed at top)
    │   ├── Logo
    │   ├── Credits badge
    │   ├── User email
    │   └── Sign out button
    │
    └── Main Content (flex-1, takes remaining space)
        └── ChatFlow.tsx (Orchestrator)
            └── ChatBot.tsx (Chat interface)
                ├── Chat Header (conditional, when route generated)
                ├── Chat Messages Container (scrollable)
                │   ├── Bot messages
                │   └── User messages
                │
                └── Step Components (conditional rendering)
                    ├── Travel Type Step
                    ├── Scenario Fork Step
                    ├── Location Step
                    ├── Time Step
                    ├── Destination Step
                    ├── Interests Step
                    └── ... more steps
```

## 📐 Layout Structure

### Index.tsx (Main Container)
```
┌─────────────────────────────────────────┐
│  Header (Fixed)                         │ ← Fixed at top, bg-white/90
│  - Logo                                 │
│  - Credits: 1/1                         │
│  - User email                           │
│  - Sign out button                      │
├─────────────────────────────────────────┤
│                                         │
│  ChatFlow (flex-1, takes all space)     │ ← Flexible container
│  └── ChatBot                            │
│      ├── Chat Messages (scrollable)     │
│      └── Step Components                │
│                                         │
└─────────────────────────────────────────┘
```

### ChatBot.tsx (Internal Layout)
```
┌─────────────────────────────────────┐
│ Main Container                      │
│ className="flex flex-col h-full"    │
│                                     │
├─────────────────────────────────────┤
│ Optional Header                     │
│ (shows when isRouteGenerated)       │
│ bg-white/80 backdrop-blur-sm        │
├─────────────────────────────────────┤
│ Chat Messages (Scrollable)          │
│ className="flex-1 overflow-y-auto"  │
│ px-4 py-4 space-y-4                │
│ min-h-0 w-full                     │
│                                     │
│ - Messages mapped in list           │
│ - ref: messagesEndRef for scroll    │
│                                     │
├─────────────────────────────────────┤
│ Step Components (NOT scrolling)     │
│ Conditional rendering based on      │
│ currentStep value:                  │
│                                     │
│ - "travel_type"                     │
│ - "scenario_fork"                   │
│ - "location"                        │
│ - "time"                            │
│ - "destination"                     │
│ - etc.                              │
│                                     │
│ Each container:                     │
│ bg-white/80 backdrop-blur-sm        │
│ border-t border-gray-100            │
│ p-4                                 │
│                                     │
└─────────────────────────────────────┘
```

## 🎨 Styling Details

### Key CSS Classes Used

#### Container Layouts
- `flex flex-col` - Vertical flex container for stacking components
- `flex-1` - Takes available space (on messages)
- `overflow-y-auto` - Scrollable vertically
- `min-h-0` - Critical for flex-1 to work properly
- `overflow-hidden` - Prevents unwanted scrollbars on main container

#### Chat Messages Container
```css
className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 w-full"
```
- `flex-1` - Takes remaining vertical space
- `overflow-y-auto` - Scrolls when content overflows
- `px-4 py-4` - Padding (16px horizontal, 16px vertical)
- `space-y-4` - Gap between messages (16px)
- `min-h-0` - Allows flex-1 to shrink below content size
- `w-full` - Full width

#### Step Components Containers
```css
className="p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100"
```
- `p-4` - Padding on all sides (16px)
- `bg-white/80` - White with 80% opacity
- `backdrop-blur-sm` - Blur effect behind (8px)
- `border-t` - Top border only
- `border-gray-100` - Light gray color

### Button Styling

#### Travel Type Labels (Fixed Height)
```css
className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 h-12"
```
- `h-12` - Fixed height (48px) - **PREVENTS JUMPING**
- `p-3` - Internal padding
- `border-2` - Border width
- Conditional classes for active/inactive state

#### Scenario Buttons (Fixed Height)
```css
className="w-full py-4 px-6 bg-gradient-to-r ... h-12"
```
- `h-12` - Fixed height (48px)
- `py-4 px-6` - Padding (top/bottom 16px, left/right 24px)
- `bg-gradient-to-r` - Gradient background

## 🔄 How It Works

### 1. **Initial Render**
- Index.tsx renders Header (fixed) and ChatFlow
- ChatFlow renders ChatBot inside a container
- ChatBot renders messages + current step

### 2. **Chat Flow**
```
1. User enters chat
2. Messages appear (added to state)
3. Messages auto-scroll (messagesEndRef)
4. Step components conditionally render based on currentStep
5. When user interacts with step, it updates state
6. New messages appear, step changes to next
```

### 3. **Scrolling Behavior**
- Only the messages container scrolls
- Step components stay at bottom
- Header doesn't scroll
- When new message appears, auto-scrolls to bottom

### 4. **No Jumping** (Why Fixed Heights Matter)
- Each button has `h-12` (48px) fixed height
- When clicked, color changes but height stays same
- No layout recalculation
- Smooth transitions without layout shifts

## 📦 Data Flow

### State Management (in ChatBot.tsx)
```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [currentStep, setCurrentStep] = useState<string>("travel_type");
const [travelType, setTravelType] = useState<string | null>(null);
const [userInput, setUserInput] = useState<string>("");
// ... more state
```

### Message Structure
```typescript
interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
}
```

### Adding Messages
```typescript
const addBotMessage = (content: string) => {
  const newMessage: Message = {
    id: Date.now().toString(),
    type: "bot",
    content
  };
  setMessages(prev => [...prev, newMessage]);
};
```

## 🎯 Key Features

### 1. **Responsive**
- Flex layout adapts to screen size
- Messages scale with viewport
- Buttons maintain fixed height

### 2. **Accessible**
- Semantic HTML
- ARIA labels on buttons
- Keyboard navigation support

### 3. **Performant**
- Virtual scrolling (messages render as needed)
- CSS transitions (no heavy animations)
- Proper memory management

### 4. **User-Friendly**
- Clear visual hierarchy
- Smooth transitions
- Auto-scroll to latest message
- No layout jumping

## 🔧 Common Modifications

### Change Button Height
```css
/* From h-12 (48px) to h-14 (56px) */
className="... h-14 ..."
```

### Change Messages Padding
```css
/* From px-4 py-4 to px-6 py-6 */
className="... px-6 py-6 ..."
```

### Change Step Component Background
```css
/* From bg-white/80 to bg-white/95 */
className="bg-white/95 ..."
```

### Add Bottom Safe Area (iOS)
```css
className="... safe-bottom"
```

## 📝 Notes

- **Why `min-h-0`?** Flex containers need it to properly collapse children
- **Why `flex-1`?** Takes all remaining space without overflow
- **Why `overflow-hidden` on main?** Prevents body scroll from affecting chat
- **Why fixed heights on buttons?** Prevents layout shift on interaction
- **Why backdrop-blur?** Creates modern, layered UI appearance
