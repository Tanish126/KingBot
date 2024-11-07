{ pkgs }: {
	deps = [
   pkgs.python39Packages.flask
		pkgs.nodejs-16_x
        pkgs.nodePackages.typescript-language-server
        pkgs.yarn
        pkgs.replitPackages.jest
	];
}