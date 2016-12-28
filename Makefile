posts-sourcefiles := $(wildcard blog/*.poly.pm)
posts-sourcelistings := $(patsubst %.poly.pm,%.pollen.html,$(posts-sourcefiles))

all:
	touch index.ptree; \
	racket utils/tags-generator.rkt; \
	raco pollen render index.ptree; \
	raco pollen render styles.css; \
	raco pollen publish . ../build
	cp -rf ../build/* ../mygithubpage/
