declare module "react-router-dom" {
  import type { ComponentType, ReactNode, AnchorHTMLAttributes, Ref } from "react";

  export interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className"> {
    to: string;
    end?: boolean;
    replace?: boolean;
    state?: unknown;
    children?: ReactNode | ((args: { isActive: boolean; isPending?: boolean }) => ReactNode);
    className?: string | ((args: { isActive: boolean; isPending?: boolean }) => string);
    ref?: Ref<HTMLAnchorElement>;
  }

  export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
    to: string;
    replace?: boolean;
    state?: unknown;
  }

  export const Link: ComponentType<LinkProps>;
  export const NavLink: ComponentType<NavLinkProps>;
  export const Navigate: ComponentType<{ to: string; replace?: boolean }>;

  export function useNavigate(): (to: string | number, opts?: { replace?: boolean; state?: unknown }) => void;
  export function useLocation(): { pathname: string; search: string; hash: string; state: unknown; key: string };
  export function useParams<T extends Record<string, string> = Record<string, string>>(): T;
}
