import { FC, ReactNode } from 'react';

interface TutorialLayoutProps {
  children: ReactNode;
}

const TutorialLayout: FC<TutorialLayoutProps> = ({ children }) => {
  return (
    <div>
      {children}
    </div>
  );
};

export default TutorialLayout;
