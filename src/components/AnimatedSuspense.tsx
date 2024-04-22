import { AnimatePresence } from "framer-motion";
import { Component, Suspense, type ReactNode } from "react";

export class AnimatedSuspense extends Component<
  {
    children: ReactNode;
    fallback: ReactNode;
  },
  { fallback: boolean }
> {
  state = { fallback: true };
  fallback = true;
  render() {
    if (typeof window === "undefined")
      return (
        <>
          <Suspense>
            <ClientSide />
          </Suspense>
          <DelayMount instance={this}>{this.props.fallback}</DelayMount>
        </>
      );
    return (
      <>
        <Suspense>
          {this.props.children}
          <DummySuccess instance={this} />
        </Suspense>
        <DelayMount instance={this}>{this.props.fallback}</DelayMount>
      </>
    );
  }
}

const ClientSide = () => {
  throw new Error("client side only");
};

class DelayMount extends Component<{
  instance: AnimatedSuspense;
  children: ReactNode;
}> {
  render(): ReactNode {
    return (
      <AnimatePresence>
        {this.props.instance.fallback ? this.props.children : null}
      </AnimatePresence>
    );
  }
}

class DummySuccess extends Component<{ instance: AnimatedSuspense }> {
  constructor(props: { instance: AnimatedSuspense }) {
    super(props);
    this.props.instance.fallback = false;
    this.props.instance.setState({ fallback: false });
  }
  render(): ReactNode {
    return null;
  }
}
