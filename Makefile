posts-sourcefiles := $(wildcard blog/*.poly.pm)
posts-sourcelistings := $(patsubst %.poly.pm,%.pollen.html,$(posts-sourcefiles))

all:
	racket utils/tags-generator.rkt; \
	raco pollen render index.ptree; \
	raco pollen render styles.css; \
	raco pollen publish . ../build
