﻿using System;

namespace Serenity.Navigation
{
    [AttributeUsage(AttributeTargets.Assembly, AllowMultiple = true)]
    public class NavigationLinkAttribute : NavigationItemAttribute
    {
        public NavigationLinkAttribute(int order, string path, string url, object permission, string icon = null)
            : base(order, path, url, permission, icon)
        {
        }

        public NavigationLinkAttribute(int order, string path, Type controller, string icon = null, string action = "Index")
            : base(order, path, controller, icon, action)
        {
        }

        public NavigationLinkAttribute(string path, string url, object permission, string icon = null)
            : base(int.MaxValue, path, url, permission, icon)
        {
        }

        public NavigationLinkAttribute(string path, Type controller, string icon = null, string action = "Index")
            : base(int.MaxValue, path, controller, icon, action)
        {
        }
    }
}