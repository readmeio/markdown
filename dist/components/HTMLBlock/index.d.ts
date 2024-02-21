export = CreateHtmlBlock;
declare function CreateHtmlBlock({ safeMode }: {
    safeMode: any;
}): (props: any) => JSX.Element;
declare namespace CreateHtmlBlock {
    function sanitize(schema: any): any;
}
