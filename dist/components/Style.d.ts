export = CreateStyle;
declare function CreateStyle({ safeMode }: {
    safeMode: any;
}): (props: any) => JSX.Element;
declare namespace CreateStyle {
    function sanitize(sanitize: any): any;
}
