import { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Settings,
  UserCog,
  Users,
  CreditCard,
  Coins,
  Receipt,
  HeartHandshake,
  PenTool,
  Plug2,
  Puzzle,
  GraduationCap,
  Linkedin,
  LifeBuoy
} from 'lucide-react';

const Sidebar: FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="w-64 bg-site-white flex flex-col rounded-tr-md">
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {/* Profile Section */}
          <div>
            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-3">
              Profile
            </h3>
            <ul className="space-y-1">
              <NavItem
                to="/overview"
                icon={<User className="h-5 w-5" />}
                label="Overview"
                active={isActive("/overview")}
              />
              <NavItem
                to="/account-settings"
                icon={<Settings className="h-5 w-5" />}
                label="Account Settings"
                active={isActive("/account-settings")}
              />
              {/* <NavItem 
                to="/profile-settings" 
                icon={<UserCog className="h-5 w-5" />} 
                label="Profile Settings"
                active={isActive("/profile-settings")} 
              /> */}
            </ul>
          </div>

          {/* Subscription Section */}
          <div>
            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-3">
              Subscription
            </h3>
            <ul className="space-y-1">
              {/* <NavItem 
                to="/team" 
                icon={<Users className="h-5 w-5" />} 
                label="Team"
                active={isActive("/team")} 
              /> */}
              <NavItem
                to="/subscription"
                icon={<CreditCard className="h-5 w-5" />}
                label="Subscription Plan"
                active={isActive("/subscription")}
              />
              {/* <NavItem 
                to="/credits" 
                icon={<Coins className="h-5 w-5" />} 
                label="Buy Extra Credits"
                active={isActive("/credits")} 
              /> */}
              {/* <NavItem 
                to="/billing" 
                icon={<Receipt className="h-5 w-5" />} 
                label="Billing"
                active={isActive("/billing")} 
              /> */}
            </ul>
          </div>

          {/* Others Section */}
          <div>
            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider mb-3">
              Others
            </h3>
            <ul className="space-y-1">
              {/* <NavItem 
                to="/refer" 
                icon={<HeartHandshake className="h-5 w-5" />} 
                label="Refer a Friend"
                active={isActive("/refer")} 
              /> */}
              <NavItem
                to="https://www.instagram.com/typus.ai/"
                target="_blank"
                icon={<HeartHandshake className="h-5 w-5" />}
                label="Creator Zone"
                active={isActive("/zone")}
              />
              <NavItem
                to="/plugins"
                icon={<Plug2 className="h-5 w-5" />}
                label="Plugins"
                active={isActive("/plugins")}
              />
              <NavItem
                to="/academy"
                icon={<GraduationCap className="h-5 w-5" />}
                label="Academy"
                active={isActive("/academy")}
              />
              <NavItem
                to="https://www.linkedin.com/groups/13072317/"
                target='_blank'
                icon={<Linkedin className="h-5 w-5" />}
                label="LinkedIn Group"
                active={isActive("/linkedin")}
              />
              <NavItem
                to="mailto:support@typus.ai"
                target='_blank'
                icon={<LifeBuoy className="h-5 w-5" />}
                label="Support"
                active={isActive("/support")}
              />
            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
};

interface NavItemProps {
  to: string;
  target?: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

const NavItem: FC<NavItemProps> = ({ to, target, icon, label, active }) => {
  return (
    <li>
      <Link
        to={to}
        target={target}
        className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm w-full transition-colors cursor-pointer
          ${active
            ? 'bg-red-50 text-red-500 border border-red-200'
            : 'hover:text-red-500'
          }`}
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
};

export default Sidebar;