// Compatibility shim: maps a subset of react-router-dom API to TanStack Router.
import {
  Link as TSLink,
  useNavigate as useTSNavigate,
  useLocation as useTSLocation,
  useRouter,
} from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { forwardRef, useEffect } from "react";

type LinkLikeProps = {
  to: string;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
  className?: string | ((args: { isActive: boolean }) => string);
  end?: boolean;
} & Omit<ComponentProps<"a">, "href" | "className">;

export const Link = forwardRef<HTMLAnchorElement, LinkLikeProps>(function Link(
  { to, replace, state, className, ...rest },
  ref,
) {
  const cls = typeof className === "function" ? className({ isActive: false }) : className;
  return (
    <TSLink
      ref={ref}
      to={to}
      replace={replace}
      // @ts-expect-error - tanstack supports state via search/loader; ignore
      state={state}
      className={cls}
      {...rest}
    />
  );
});

export const NavLink = forwardRef<HTMLAnchorElement, LinkLikeProps>(function NavLink(
  { to, className, end, children, ...rest },
  ref,
) {
  const location = useTSLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
  const cls = typeof className === "function" ? className({ isActive }) : className;
  return (
    // @ts-expect-error - rest may include state; TanStack ignores it
    <TSLink ref={ref} to={to} className={cls} {...rest}>
      {typeof children === "function"
        ? // react-router NavLink supports children as function
          (children as (a: { isActive: boolean }) => ReactNode)({ isActive })
        : children}
    </TSLink>
  );
});

export function useNavigate() {
  const nav = useTSNavigate();
  return (to: string | number, opts?: { replace?: boolean; state?: unknown }) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    nav({ to, replace: opts?.replace });
  };
}

export function useLocation() {
  const loc = useTSLocation();
  return {
    pathname: loc.pathname,
    search: loc.searchStr ?? "",
    hash: loc.hash ?? "",
    state: (loc.state as unknown) ?? null,
    key: loc.pathname,
  };
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const nav = useTSNavigate();
  useEffect(() => {
    nav({ to, replace });
  }, [to, replace, nav]);
  return null;
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const router = useRouter();
  return (router.state.matches.at(-1)?.params ?? {}) as T;
}
