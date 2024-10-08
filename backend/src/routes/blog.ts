import { createBlogInput, updateBlogInput } from "@manaskng/medium-common";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import { verify } from "hono/jwt";
import { buildBlogSearchQuery, buildUserSearchQuery } from "../db/queries";

export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    },
    Variables: {
        userId: string;
    }
}>();

blogRouter.use("/*", async (c, next) => {
    const authHeader = c.req.header("authorization") || "";
    try {
        const user = await verify(authHeader, c.env.JWT_SECRET);
        if (user) {
            c.set("userId", user.id);
            await next();
        } else {
            c.status(403);
            return c.json({
                message: "You are not logged in"
            })
        }
    } catch (e) {
        c.status(403);
        return c.json({
            message: "You are not logged in"
        })
    }
});

blogRouter.post('/', async (c) => {
    const body = await c.req.json();
    const { success } = createBlogInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }

    const authorId = c.get("userId");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const blog = await prisma.blog.create({
        data: {
            title: body.title,
            content: body.content,
            authorId: String(authorId)
        }
    })

    return c.json({
        id: blog.id
    })
})

blogRouter.put('/', async (c) => {
    const body = await c.req.json();
    const { success } = updateBlogInput.safeParse(body);
    if (!success) {
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const blog = await prisma.blog.update({
        where: {
            id: body.id
        },
        data: {
            title: body.title,
            content: body.content
        }
    })

    return c.json({
        id: blog.id
    })
})

// Todo: add pagination
blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())
    const blogs = await prisma.blog.findMany({
        select: {
            content: true,
            title: true,
            publishedDate: true,
            id: true,
            author: {
                select: {
                    username: true
                }
            }
        }
    });
    return c.json({
        blogs
    })
})

blogRouter.get("/bulkUser/:id", async (c) => {
    try {
        const userId = c.req.param("id");
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL,
        }).$extends(withAccelerate())
        const blogs = await prisma.blog.findMany({
            where: {
                authorId: userId,
            },
            select: {
                content: true,
                title: true,
                id: true,
                publishedDate: true,
                author: {
                    select: {
                        username: true,
                    },
                },
                published: true,

            },
        });
        return c.json({
            blogs: blogs,
        });
    } catch (e) {
        console.log(e);
        c.status(411);
        return c.json({
            message: "Error while fetching post",
        });
    }
});

blogRouter.get('/:id', async (c) => {
    const id = c.req.param("id");
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    try {
        const blog = await prisma.blog.findFirst({
            where: {
                id: String(id)
            },
            select: {
                id: true,
                title: true,
                content: true,
                publishedDate: true,
                author: {
                    select: {
                        username: true
                    }
                }
            }
        })
        return c.json({
            blog
        });
    } catch (e) {
        c.status(411);
        return c.json({
            message: "Error while fetching blog post"
        });
    }
})

blogRouter.get("/search", async (c) => {
    try {
        const keyword = c.req.query("keyword") || "";
        const prisma = new PrismaClient({
            datasourceUrl: c.env.DATABASE_URL,
        }).$extends(withAccelerate())
        const blogQuery = buildBlogSearchQuery(keyword);
        const userQuery = buildUserSearchQuery(keyword);
        const [blogs, users] = await Promise.all([
            prisma.blog.findMany(blogQuery),
            prisma.user.findMany(userQuery),
        ]);
        return c.json({
            blogs: blogs,
            users: users,
        });
    } catch (e) {
        c.status(411);
        return c.json({
            message: "Error while fetching blog post",
            error: e,
        });
    }
});

