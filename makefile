MAKEFLAGS := --silent --always-make
PAR := $(MAKE) -j 128
TEST := test/test.mjs

test-w:
	deno run --watch $(TEST)

test:
	deno run $(TEST)

prep: test
